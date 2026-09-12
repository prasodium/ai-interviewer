import { useState } from 'react'
import { speakWithAiVoice, stopAiVoice } from '../services/aiSpeechService'
import type { AiVoiceName } from '@shared/types'

interface SpeakOptions {
  aiVoice: AiVoiceName
  speed: number
  volume: number
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  /** Resolves once playback has finished. Throws if speech synthesis fails - there is no fallback voice. */
  async function speak(text: string, options: SpeakOptions): Promise<void> {
    if (!text.trim()) {
      return
    }
    await speakWithAiVoice(text, options.aiVoice, options.speed, options.volume, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    })
  }

  function stop(): void {
    stopAiVoice()
    setIsSpeaking(false)
  }

  return {
    isSpeaking,
    speak,
    stop
  }
}
