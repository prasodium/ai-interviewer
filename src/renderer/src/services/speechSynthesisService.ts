export interface SpeechService {
  readonly isSupported: boolean
  speak(text: string): void
  stop(): void
}

export interface SpeechOptions {
  voiceName: string | null
  rate: number
  volume: number
  onStart?: () => void
  onEnd?: () => void
}

/** Wraps window.speechSynthesis - free, offline, and built into the browser engine. */
export class BrowserSpeechSynthesisService implements SpeechService {
  readonly isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  speak(text: string, options?: Partial<SpeechOptions>): void {
    if (!this.isSupported || !text.trim()) {
      return
    }

    this.stop()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options?.rate ?? 1
    utterance.volume = options?.volume ?? 1

    if (options?.voiceName) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.name === options.voiceName)
      if (voice) {
        utterance.voice = voice
      }
    }

    if (options?.onStart) {
      utterance.onstart = options.onStart
    }
    if (options?.onEnd) {
      utterance.onend = options.onEnd
    }

    window.speechSynthesis.speak(utterance)
  }

  stop(): void {
    if (this.isSupported) {
      window.speechSynthesis.cancel()
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.isSupported ? window.speechSynthesis.getVoices() : []
  }
}

export const speechSynthesisService = new BrowserSpeechSynthesisService()
