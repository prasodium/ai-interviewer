import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import InterviewAvatar, { type AvatarState } from '../components/InterviewAvatar'
import InterviewProgress from '../components/InterviewProgress'
import InterviewTimer from '../components/InterviewTimer'
import MicrophoneButton from '../components/MicrophoneButton'
import QuestionDisplay from '../components/QuestionDisplay'
import TranscriptPanel from '../components/TranscriptPanel'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useVoiceAnswer } from '../hooks/useVoiceAnswer'
import { AudioRecorderError } from '../services/audioRecorderService'
import { api } from '../services/electronApi'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type { AiStatus, AppSettings, InterviewState } from '@shared/types'
import type { AnswerInterviewResponse } from '@shared/ipc'

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

export default function InterviewPage(): JSX.Element | null {
  const navigate = useNavigate()
  const { setup, resumeAnalysis, setActiveInterviewId } = useInterviewFlow()

  const [interviewState, setInterviewState] = useState<InterviewState | null>(null)
  const [phase, setPhase] = useState<InterviewPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [forceTextMode, setForceTextMode] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState<AppSettings | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)

  const hasStartedRef = useRef(false)
  const cancelledRef = useRef(false)
  const isAnsweringRef = useRef(false)
  const forceTextModeRef = useRef(false)
  const isMutedRef = useRef(false)
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

  function updateMuted(muted: boolean): void {
    isMutedRef.current = muted
    setIsMuted(muted)
    if (muted) {
      synthesis.stop()
    }
  }

  function switchToTyping(): void {
    forceTextModeRef.current = true
    setForceTextMode(true)
    voiceAnswer.cancel()
  }

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
        volume: voiceSettings!.voiceVolume,
        muted: isMutedRef.current
      })
      if (cancelledRef.current) return

      if (state.interviewFinished) {
        await goToResults(state.interviewId)
        return
      }

      let answerText: string
      if (!forceTextModeRef.current) {
        setPhase('listening')
        try {
          answerText = await voiceAnswer.recordAndTranscribe()
          setPhase('transcribing')
        } catch (err) {
          if (cancelledRef.current) return
          const isUserCancelled = err instanceof AudioRecorderError && err.reason === 'cancelled'
          forceTextModeRef.current = true
          setForceTextMode(true)
          if (!isUserCancelled) {
            setError(err instanceof Error ? err.message : 'Voice input failed.')
          }
          setPhase('awaiting-text')
          answerText = await waitForManualTextSubmit()
        }
      } else {
        setPhase('awaiting-text')
        answerText = await waitForManualTextSubmit()
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
        setInterviewState(state)
        setActiveInterviewId(state.interviewId)
        runInterviewLoop(state, interviewerReply)
      })
      .catch((err: Error) => setError(err.message))
    // Intentionally depends only on [setup, voiceSettings] - hasStartedRef prevents re-entry.
  }, [setup, voiceSettings])

  function handleMicClick(): void {
    voiceAnswer.stopListening()
  }

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

          <div className="row">
            <Button variant="secondary" onClick={() => updateMuted(!isMuted)}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => interviewState && synthesis.speak(interviewState.currentQuestion, {
                aiVoice: voiceSettings!.aiVoice,
                voiceName: voiceSettings!.voiceName,
                rate: voiceSettings!.voiceSpeed,
                volume: voiceSettings!.voiceVolume,
                muted: false
              })}
              disabled={!interviewState?.currentQuestion || phase === 'listening'}
            >
              Replay
            </Button>
          </div>
        </div>

        <div className="interview-bottom">
          {forceTextMode || phase === 'awaiting-text' ? (
            <div className="fallback-answer stack">
              <textarea
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder="Type your answer here"
                disabled={phase !== 'awaiting-text'}
              />
              <Button onClick={handleManualSubmit} disabled={phase !== 'awaiting-text' || !typedAnswer.trim()}>
                Submit Answer
              </Button>
            </div>
          ) : (
            <>
              <MicrophoneButton isListening={phase === 'listening'} disabled={phase !== 'listening'} onClick={handleMicClick} />
              <p className="text-muted" style={{ fontSize: 13 }}>
                {phase === 'listening'
                  ? "Listening - click the mic when you're done, or just stop talking."
                  : 'The mic listens automatically after each question.'}
              </p>
              <button type="button" className="button button--secondary" onClick={switchToTyping}>
                Type answer instead
              </button>
            </>
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
