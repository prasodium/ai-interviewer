import { api } from './electronApi'
import type { AiVoiceName } from '@shared/types'

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

/** Sends a recorded answer to OpenAI's Whisper model and returns the transcribed text. */
export async function transcribeRecording(blob: Blob, mimeType: string): Promise<string> {
  const audioBase64 = await blobToBase64(blob)
  const { text } = await api.speech.transcribe({ audioBase64, mimeType })
  return text
}

interface AiSpeechPlaybackHandlers {
  onStart?: () => void
  onEnd?: () => void
}

let currentAudio: HTMLAudioElement | null = null

/** Stops whatever AI-voice audio is currently playing, if any (ending the interview, etc). */
export function stopAiVoice(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}

/** Synthesizes speech with OpenAI's TTS and plays it. Throws if the API call fails - there is no fallback voice. */
export async function speakWithAiVoice(
  text: string,
  voice: AiVoiceName,
  speed: number,
  volume: number,
  handlers: AiSpeechPlaybackHandlers
): Promise<void> {
  const { audioBase64 } = await api.speech.synthesize({ text, voice, speed })

  stopAiVoice()

  const url = base64ToObjectUrl(audioBase64, 'audio/mpeg')
  const audio = new Audio(url)
  audio.volume = Math.min(1, Math.max(0, volume))
  currentAudio = audio

  return new Promise<void>((resolve, reject) => {
    audio.onplay = () => handlers.onStart?.()
    const cleanup = (): void => {
      if (currentAudio === audio) {
        currentAudio = null
      }
      URL.revokeObjectURL(url)
      handlers.onEnd?.()
    }
    audio.onended = () => {
      cleanup()
      resolve()
    }
    audio.onerror = () => {
      cleanup()
      reject(new Error('Playback failed.'))
    }
    audio.play().catch((error) => {
      cleanup()
      reject(error)
    })
  })
}
