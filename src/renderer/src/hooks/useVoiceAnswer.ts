import { useRef, useState } from 'react'
import { AudioRecorderError, AudioRecorderService } from '../services/audioRecorderService'
import { transcribeRecording } from '../services/aiSpeechService'

export type VoiceAnswerStatus = 'idle' | 'listening' | 'transcribing' | 'error'

export function useVoiceAnswer() {
  const recorderRef = useRef<AudioRecorderService>(new AudioRecorderService())
  const [status, setStatus] = useState<VoiceAnswerStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  /** Starts listening and resolves with the transcribed answer once the candidate goes quiet. */
  async function recordAndTranscribe(): Promise<string> {
    setStatus('listening')
    setError(null)
    try {
      const { blob, mimeType } = await recorderRef.current.start()
      setStatus('transcribing')
      const text = await transcribeRecording(blob, mimeType)
      setStatus('idle')
      return text
    } catch (err) {
      if (err instanceof AudioRecorderError && err.reason === 'cancelled') {
        setStatus('idle')
        throw err
      }
      const message = err instanceof Error ? err.message : 'Something went wrong while recording your answer.'
      setStatus('error')
      setError(message)
      throw err
    }
  }

  /** Ends the answer early - used when the candidate signals they are done before the silence timeout. */
  function stopListening(): void {
    recorderRef.current.stop()
  }

  /** Aborts recording without transcribing - used when the interview ends or the page unmounts. */
  function cancel(): void {
    recorderRef.current.cancel()
  }

  return {
    isSupported: AudioRecorderService.isSupported(),
    status,
    error,
    recordAndTranscribe,
    stopListening,
    cancel
  }
}
