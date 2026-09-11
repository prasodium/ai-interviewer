import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserSpeechRecognitionService } from '../services/speechRecognitionService'

export type ListeningStatus = 'idle' | 'listening' | 'error'

export function useSpeechRecognition() {
  const service = useMemo(() => new BrowserSpeechRecognitionService(), [])
  const [status, setStatus] = useState<ListeningStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    service.onResult((text, isFinal) => {
      if (isFinal) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${text}`.trim()
        setTranscript(finalTranscriptRef.current)
      } else {
        setTranscript(`${finalTranscriptRef.current} ${text}`.trim())
      }
    })

    service.onError((message) => {
      if (message === 'no-speech' || message === 'aborted') {
        setStatus('idle')
        return
      }
      setError(message)
      setStatus('error')
    })

    service.onEnd(() => {
      setStatus((current) => (current === 'error' ? current : 'idle'))
    })
  }, [service])

  function start(): void {
    finalTranscriptRef.current = ''
    setTranscript('')
    setError(null)
    setStatus('listening')
    service.startListening()
  }

  function stop(): void {
    service.stopListening()
  }

  return {
    isSupported: service.isSupported,
    status,
    transcript,
    error,
    start,
    stop
  }
}
