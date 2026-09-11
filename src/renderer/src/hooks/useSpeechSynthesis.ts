import { useState } from 'react'
import { speechSynthesisService } from '../services/speechSynthesisService'

interface SpeakOptions {
  voiceName: string | null
  rate: number
  volume: number
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  function speak(text: string, options: SpeakOptions): void {
    speechSynthesisService.speak(text, {
      ...options,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    })
  }

  function stop(): void {
    speechSynthesisService.stop()
    setIsSpeaking(false)
  }

  return {
    isSupported: speechSynthesisService.isSupported,
    isSpeaking,
    speak,
    stop
  }
}
