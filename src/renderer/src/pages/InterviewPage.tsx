import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InterviewAvatar, { type AvatarState } from '../components/InterviewAvatar'
import InterviewProgress from '../components/InterviewProgress'
import InterviewTimer from '../components/InterviewTimer'
import QuestionDisplay from '../components/QuestionDisplay'
import TranscriptPanel from '../components/TranscriptPanel'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useVoiceAnswer } from '../hooks/useVoiceAnswer'
import { AudioRecorderError } from '../services/audioRecorderService'
import { isLikelyEchoOfQuestion, isLikelySilenceHallucination } from '../services/echoDetection'
import { api } from '../services/electronApi'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type { AiStatus, AppSettings, InterviewState } from '@shared/types'
import type { AnswerInterviewResponse } from '@shared/ipc'

/**
 * The interview is fully hands-free by design: the AI speaks, the mic
 * listens automatically and stops on its own once the candidate goes
 * quiet, and the next question follows - no buttons to press mid-answer.
 * The only manual control is ending the interview early. Typing is used
 * automatically (never as a button the candidate has to choose) when
 * voice genuinely isn't available.
 */
type InterviewPhase =
  | 'loading'
  | 'speaking'
  | 'listening'
  | 'transcribing'
  | 'awaiting-text'
  | 'thinking'
  | 'finishing'

const PHASE_STATUS: Record<InterviewPhase, string> = {
  loading: 'Preparing your interview...',
  speaking: 'Speaking...',
  listening: 'Listening...',
  transcribing: 'Processing your answer...',
  'awaiting-text': 'Type your answer below.',
  thinking: 'Thinking...',
  finishing: 'Generating your report...'
}

const PHASE_AVATAR: Record<InterviewPhase, AvatarState> = {
  loading: 'thinking',
  speaking: 'speaking',
  listening: 'listening',
  transcribing: 'thinking',
  'awaiting-text': 'idle',
  thinking: 'thinking',
  finishing: 'thinking'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** How many times to re-listen before giving up on voice for the rest of the interview if every capture looks like an echo of the question. */
const MAX_ECHO_RETRIES = 2

export default function InterviewPage(): JSX.Element | null {
  const navigate = useNavigate()
  const { setup, resumeAnalysis, setActiveInterviewId } = useInterviewFlow()

  const [interviewState, setInterviewState] = useState<InterviewState | null>(null)
  const [phase, setPhase] = useState<InterviewPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [forceTextMode, setForceTextMode] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [voiceSettings, setVoiceSettings] = useState<AppSettings | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)

  const hasStartedRef = useRef(false)
  const cancelledRef = useRef(false)
  const isAnsweringRef = useRef(false)
  const forceTextModeRef = useRef(false)
  const pendingTextResolveRef = useRef<((text: string) => void) | null>(null)

  const synthesis = useSpeechSynthesis()
  const voiceAnswer = useVoiceAnswer()

  useEffect(() => {
    Promise.all([api.settings.get(), api.settings.getAiStatus()]).then(([settings, status]) => {
      setVoiceSettings(settings)
      setAiStatus(status)
      const voiceUnavailable = status.usingMockAi || !voiceAnswer.isSupported
      forceTextModeRef.current = voiceUnavailable
      setForceTextMode(voiceUnavailable)
    })
    return () => {
      cancelledRef.current = true
      voiceAnswer.cancel()
      synthesis.stop()
    }
    // Runs once on mount only - voiceAnswer/synthesis identities are stable enough for this setup+cleanup pair.
  }, [])

  function waitForManualTextSubmit(): Promise<string> {
    return new Promise<string>((resolve) => {
      pendingTextResolveRef.current = resolve
    })
  }

  function handleManualSubmit(): void {
    const text = typedAnswer.trim()
    if (!text || !pendingTextResolveRef.current) {
      return
    }
    const resolve = pendingTextResolveRef.current
    pendingTextResolveRef.current = null
    setTypedAnswer('')
    resolve(text)
  }

  async function goToResults(interviewId: string): Promise<void> {
    setPhase('finishing')
    try {
      await api.interview.finish(interviewId)
      navigate(`/results/${interviewId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the final report.')
    }
  }

  async function runInterviewLoop(initialState: InterviewState, initialReply: string): Promise<void> {
    let state = initialState
    let reply = initialReply

    while (!cancelledRef.current) {
      setPhase('speaking')
      await synthesis.speak(reply, {
        aiVoice: voiceSettings!.aiVoice,
        voiceName: voiceSettings!.voiceName,
        rate: voiceSettings!.voiceSpeed,
        volume: voiceSettings!.voiceVolume
      })
      if (cancelledRef.current) return

      if (state.interviewFinished) {
        await goToResults(state.interviewId)
        return
      }

      let answerText = ''
      let echoRetriesLeft = MAX_ECHO_RETRIES
      let haveValidAnswer = false

      while (!haveValidAnswer) {
        if (!forceTextModeRef.current) {
          // A brief settle buffer after speech ends, before arming the mic -
          // otherwise the tail end of the AI's own voice (still resonating
          // briefly through the speakers) can get captured as the answer.
          await sleep(500)
          if (cancelledRef.current) return
          synthesis.stop()

          setPhase('listening')
          try {
            answerText = await voiceAnswer.recordAndTranscribe()
            setPhase('transcribing')
          } catch (err) {
            if (cancelledRef.current) return
            const reason = err instanceof AudioRecorderError ? err.reason : null

            if (reason === 'no-speech-detected' && echoRetriesLeft > 0) {
              echoRetriesLeft -= 1
              setError(err instanceof Error ? err.message : 'No speech detected.')
              continue
            }

            forceTextModeRef.current = true
            setForceTextMode(true)
            if (reason !== 'cancelled') {
              setError(err instanceof Error ? err.message : 'Voice input failed.')
            }
            setPhase('awaiting-text')
            answerText = await waitForManualTextSubmit()
            haveValidAnswer = true
            break
          }

          const soundsLikeEcho =
            isLikelyEchoOfQuestion(reply, answerText) || isLikelySilenceHallucination(answerText)
          if (!soundsLikeEcho) {
            setError(null)
            haveValidAnswer = true
          } else if (echoRetriesLeft > 0) {
            echoRetriesLeft -= 1
            setError("Didn't catch an answer there - listening again.")
          } else {
            // Repeated echoes even after retrying - voice isn't working
            // reliably in this environment, so switch to typing instead
            // of looping on the same false capture forever.
            forceTextModeRef.current = true
            setForceTextMode(true)
            setError("Having trouble hearing your answers clearly - let's switch to typing.")
            setPhase('awaiting-text')
            answerText = await waitForManualTextSubmit()
            haveValidAnswer = true
          }
        } else {
          setPhase('awaiting-text')
          answerText = await waitForManualTextSubmit()
          haveValidAnswer = true
        }
      }
      if (cancelledRef.current) return

      setPhase('thinking')
      let result: AnswerInterviewResponse | null = null
      while (!result) {
        isAnsweringRef.current = true
        try {
          result = await api.interview.answer({ interviewId: state.interviewId, answerText })
          setError(null)
        } catch (err) {
          if (cancelledRef.current) {
            isAnsweringRef.current = false
            return
          }
          setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
          setTypedAnswer(answerText)
          forceTextModeRef.current = true
          setForceTextMode(true)
          setPhase('awaiting-text')
          answerText = await waitForManualTextSubmit()
        } finally {
          isAnsweringRef.current = false
        }
      }
      if (cancelledRef.current) return

      state = result.state
      reply = result.interviewerReply
      setInterviewState(state)
    }
  }

  useEffect(() => {
    if (!setup) {
      navigate('/setup')
      return
    }
    if (hasStartedRef.current || !voiceSettings) {
      return
    }
    hasStartedRef.current = true

    api.interview
      .start({ setup, resumeAnalysis })
      .then(({ state, interviewerReply }) => {
        // React's StrictMode fires the mount effect's cleanup once as a
        // dev-only check, which sets cancelledRef true before the real
        // run ever starts - clear it here, right as the real work begins.
        cancelledRef.current = false
        setInterviewState(state)
        setActiveInterviewId(state.interviewId)
        runInterviewLoop(state, interviewerReply)
      })
      .catch((err: Error) => setError(err.message))
    // Intentionally depends only on [setup, voiceSettings] - hasStartedRef prevents re-entry.
  }, [setup, voiceSettings])

  function handleTimeUp(): void {
    if (cancelledRef.current || !interviewState || interviewState.interviewFinished) {
      return
    }
    if (isAnsweringRef.current) {
      return
    }
    cancelledRef.current = true
    voiceAnswer.cancel()
    synthesis.stop()
    goToResults(interviewState.interviewId)
  }

  function handleEndInterview(): void {
    if (!interviewState || cancelledRef.current) {
      return
    }
    const confirmed = window.confirm('End the interview now? A report will be generated from your answers so far.')
    if (!confirmed) {
      return
    }
    cancelledRef.current = true
    voiceAnswer.cancel()
    synthesis.stop()
    goToResults(interviewState.interviewId)
  }

  if (!setup) {
    return null
  }

  const avatarState = PHASE_AVATAR[phase]
  const statusText = PHASE_STATUS[phase]

  return (
    <div className="interview-layout">
      <div className="interview-main-column">
        <div className="interview-topbar">
          <span>{setup.jobRole}</span>
          {interviewState && (
            <InterviewProgress
              questionNumber={interviewState.questionNumber}
              totalQuestions={interviewState.totalQuestions}
            />
          )}
          {interviewState && (
            <InterviewTimer
              startedAt={interviewState.startedAt}
              lengthMinutes={setup.lengthMinutes}
              onTimeUp={handleTimeUp}
            />
          )}
        </div>

        {error && <div className="banner banner--danger">{error}</div>}

        {aiStatus?.usingMockAi && (
          <div className="banner banner--warning">
            Voice input and the natural AI voice both need a real OpenAI API key (mock mode stays free) - typing is
            used for this interview. Add a key in Settings to enable hands-free voice.
          </div>
        )}

        {!aiStatus?.usingMockAi && !voiceAnswer.isSupported && (
          <div className="banner banner--warning">
            Voice recording is not available in this environment. Please type your answers instead.
          </div>
        )}

        <div className="interview-center">
          <InterviewAvatar state={avatarState} />
          <QuestionDisplay question={interviewState?.currentQuestion || ''} />
          <div className="interview-status">{statusText}</div>
        </div>

        <div className="interview-bottom">
          {forceTextMode && (
            <div className="fallback-answer stack">
              <textarea
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder="Type your answer here"
                disabled={phase !== 'awaiting-text'}
              />
              <button
                type="button"
                className="button button--primary"
                onClick={handleManualSubmit}
                disabled={phase !== 'awaiting-text' || !typedAnswer.trim()}
              >
                Submit Answer
              </button>
            </div>
          )}

          <button type="button" className="button button--danger" onClick={handleEndInterview}>
            End Interview
          </button>
        </div>
      </div>

      <TranscriptPanel messages={interviewState?.transcript ?? []} />
    </div>
  )
}
