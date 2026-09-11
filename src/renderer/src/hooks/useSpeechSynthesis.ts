import { useState } from 'react'
import { speechSynthesisService } from '../services/speechSynthesisService'
import { speakWithAiVoice, stopAiVoice } from '../services/aiSpeechService'
import type { AiVoiceName } from '@shared/types'

interface SpeakOptions {
  aiVoice: AiVoiceName
  voiceName: string | null
  rate: number
  volume: number
  muted: boolean
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  /** Resolves once playback has finished (or immediately if muted). */
  async function speak(text: string, options: SpeakOptions): Promise<void> {
    if (options.muted || !text.trim()) {
      return
    }

    const onStart = (): void => setIsSpeaking(true)

    return new Promise<void>((resolve) => {
      const onEnd = (): void => {
        setIsSpeaking(false)
        resolve()
      }

      speakWithAiVoice(text, options.aiVoice, { onStart, onEnd })
        .then((usedAiVoice) => {
          if (!usedAiVoice) {
            speechSynthesisService.speak(text, {
              voiceName: options.voiceName,
              rate: options.rate,
              volume: options.volume,
              onStart,
              onEnd
            })
          }
        })
        .catch(() => {
          speechSynthesisService.speak(text, {
            voiceName: options.voiceName,
            rate: options.rate,
            volume: options.volume,
            onStart,
            onEnd
          })
        })
    })
  }

  function stop(): void {
    stopAiVoice()
    speechSynthesisService.stop()
    setIsSpeaking(false)
  }

  return {
    isSpeaking,
    speak,
    stop
  }
}
