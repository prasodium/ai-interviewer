import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import InterviewAvatar, { type AvatarState } from '../components/InterviewAvatar'
import InterviewProgress from '../components/InterviewProgress'
import InterviewTimer from '../components/InterviewTimer'
import MicrophoneButton from '../components/MicrophoneButton'
import QuestionDisplay from '../components/QuestionDisplay'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { api } from '../services/electronApi'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type { AppSettings, InterviewState } from '@shared/types'

export default function InterviewPage(): JSX.Element | null {
  const navigate = useNavigate()
  const { setup, resumeAnalysis, setActiveInterviewId } = useInterviewFlow()

  const [interviewState, setInterviewState] = useState<InterviewState | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useTextFallback, setUseTextFallback] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState<AppSettings | null>(null)

  const hasStartedRef = useRef(false)
  const hasEndedRef = useRef(false)

  const recognition = useSpeechRecognition()
  const synthesis = useSpeechSynthesis()

  useEffect(() => {
    api.settings.get().then(setVoiceSettings)
  }, [])

  function speakQuestion(text: string): void {
    if (isMuted || !voiceSettings) {
      return
    }
    synthesis.speak(text, {
      voiceName: voiceSettings.voiceName,
      rate: voiceSettings.voiceSpeed,
      volume: voiceSettings.voiceVolume
    })
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

    setIsThinking(true)
    api.interview
      .start({ setup, resumeAnalysis })
      .then(({ state, interviewerReply }) => {
        setInterviewState(state)
        setActiveInterviewId(state.interviewId)
        speakQuestion(interviewerReply)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsThinking(false))
    // Only re-run when the setup itself changes or voice settings first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, voiceSettings])

  async function goToResults(interviewId: string): Promise<void> {
    setIsFinishing(true)
    try {
      await api.interview.finish(interviewId)
      navigate(`/results/${interviewId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the final report.')
      setIsFinishing(false)
    }
  }

  async function submitAnswer(answerText: string): Promise<void> {
    if (!interviewState || isThinking) {
      return
    }
    setIsThinking(true)
    setError(null)
    setTypedAnswer('')

    try {
      const { state, interviewerReply } = await api.interview.answer({
        interviewId: interviewState.interviewId,
        answerText
      })
      setInterviewState(state)

      if (state.interviewFinished) {
        speakQuestion(interviewerReply)
        await goToResults(state.interviewId)
      } else {
        speakQuestion(interviewerReply)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsThinking(false)
    }
  }

  function handleMicClick(): void {
    if (recognition.status === 'listening') {
      recognition.stop()
      submitAnswer(recognition.transcript)
    } else {
      recognition.start()
    }
  }

  function handleTimeUp(): void {
    if (hasEndedRef.current || !interviewState || interviewState.interviewFinished) {
      return
    }
    hasEndedRef.current = true
    goToResults(interviewState.interviewId)
  }

  function handleEndInterview(): void {
    if (!interviewState || hasEndedRef.current) {
      return
    }
    const confirmed = window.confirm('End the interview now? A report will be generated from your answers so far.')
    if (!confirmed) {
      return
    }
    hasEndedRef.current = true
    goToResults(interviewState.interviewId)
  }

  if (!setup) {
    return null
  }

  const avatarState: AvatarState = synthesis.isSpeaking
    ? 'speaking'
    : recognition.status === 'listening'
      ? 'listening'
      : isThinking || isFinishing
        ? 'thinking'
        : 'idle'

  const statusText = synthesis.isSpeaking
    ? 'Speaking...'
    : recognition.status === 'listening'
      ? 'Listening...'
      : isFinishing
        ? 'Generating your report...'
        : isThinking
          ? 'Thinking...'
          : ''

  return (
    <div>
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

      {!recognition.isSupported && !useTextFallback && (
        <div className="banner banner--warning">
          Voice input is not available in this environment. Please type your answers instead.
        </div>
      )}

      {recognition.error && (
        <div className="banner banner--warning">
          We could not access your microphone ({recognition.error}). Please type your answer instead.
        </div>
      )}

      <div className="interview-center">
        <InterviewAvatar state={avatarState} />
        <QuestionDisplay question={interviewState?.currentQuestion || (isThinking ? 'Preparing your interview...' : '')} />
        <div className="interview-status">{statusText}</div>

        <div className="row">
          <Button variant="secondary" onClick={() => setIsMuted((muted) => !muted)}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => interviewState && speakQuestion(interviewState.currentQuestion)}
            disabled={!interviewState?.currentQuestion}
          >
            Replay
          </Button>
        </div>
      </div>

      <div className="interview-bottom">
        {useTextFallback || !recognition.isSupported ? (
          <div className="fallback-answer stack">
            <textarea
              value={typedAnswer}
              onChange={(event) => setTypedAnswer(event.target.value)}
              placeholder="Type your answer here"
              disabled={isThinking || isFinishing || !interviewState || interviewState.interviewFinished}
            />
            <Button
              onClick={() => submitAnswer(typedAnswer)}
              disabled={isThinking || isFinishing || !interviewState || interviewState.interviewFinished}
            >
              Submit Answer
            </Button>
          </div>
        ) : (
          <>
            <MicrophoneButton
              isListening={recognition.status === 'listening'}
              disabled={isThinking || isFinishing || !interviewState || interviewState.interviewFinished}
              onClick={handleMicClick}
            />
            {recognition.status === 'listening' && recognition.transcript && (
              <p className="text-muted">{recognition.transcript}</p>
            )}
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setUseTextFallback(true)}
            >
              Type answer instead
            </button>
          </>
        )}

        <button type="button" className="button button--danger" onClick={handleEndInterview}>
          End Interview
        </button>
      </div>
    </div>
  )
}
