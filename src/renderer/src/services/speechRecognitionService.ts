export interface SpeechRecognitionService {
  readonly isSupported: boolean
  startListening(): void
  stopListening(): void
  isListening(): boolean
  onResult(handler: (transcript: string, isFinal: boolean) => void): void
  onError(handler: (message: string) => void): void
  onEnd(handler: () => void): void
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

/**
 * Wraps the browser's built-in Web Speech API. This is free and works
 * offline-adjacent (no OpenAI audio model is used) - see the AI
 * Interviewer cost-control rules. Falls back gracefully when the API
 * is unavailable (e.g. some Linux builds).
 */
export class BrowserSpeechRecognitionService implements SpeechRecognitionService {
  private recognition: SpeechRecognitionLike | null = null
  private listening = false
  private resultHandler: ((transcript: string, isFinal: boolean) => void) | null = null
  private errorHandler: ((message: string) => void) | null = null
  private endHandler: (() => void) | null = null

  readonly isSupported: boolean

  constructor() {
    const Recognition = getSpeechRecognitionConstructor()
    this.isSupported = Boolean(Recognition)

    if (Recognition) {
      this.recognition = new Recognition()
      this.recognition.lang = 'en-US'
      this.recognition.continuous = true
      this.recognition.interimResults = true

      this.recognition.onresult = (event) => {
        let transcript = ''
        let isFinal = false
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          transcript += result[0].transcript
          if (result.isFinal) {
            isFinal = true
          }
        }
        this.resultHandler?.(transcript, isFinal)
      }

      this.recognition.onerror = (event) => {
        this.listening = false
        this.errorHandler?.(event.error)
      }

      this.recognition.onend = () => {
        this.listening = false
        this.endHandler?.()
      }
    }
  }

  startListening(): void {
    if (!this.recognition || this.listening) {
      return
    }
    this.listening = true
    this.recognition.start()
  }

  stopListening(): void {
    if (!this.recognition || !this.listening) {
      return
    }
    this.recognition.stop()
  }

  isListening(): boolean {
    return this.listening
  }

  onResult(handler: (transcript: string, isFinal: boolean) => void): void {
    this.resultHandler = handler
  }

  onError(handler: (message: string) => void): void {
    this.errorHandler = handler
  }

  onEnd(handler: () => void): void {
    this.endHandler = handler
  }
}
