import OpenAI, { toFile } from 'openai'
import { logger } from '../../services/logger'
import { getAiStatus, resolveApiKey } from '../../services/settingsService'
import { AIRequestError } from './aiErrors'
import type { AiVoiceName } from '@shared/types'

/**
 * Speech in this app goes through OpenAI rather than the browser's Web
 * Speech API for a concrete reason: Electron's bundled Chromium does not
 * implement SpeechRecognition (speech-to-text) at all - it depends on a
 * private Google service that only official Chrome ships credentials
 * for. SpeechSynthesis (text-to-speech) does technically work in
 * Electron via the OS voices, but sounds noticeably robotic compared to
 * OpenAI's TTS voices, so it is kept only as an automatic fallback for
 * mock mode / when no API key is configured (see the renderer's speech
 * services).
 */

function getClient(): OpenAI {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new AIRequestError('Voice features need an OpenAI API key. Add one in Settings, or type your answer.')
  }
  return new OpenAI({ apiKey })
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  if (getAiStatus().usingMockAi) {
    throw new AIRequestError(
      'Voice input needs a configured OpenAI API key (mock mode keeps everything free, but text-to-speech and speech-to-text both require the real API). Please type your answer, or add a key in Settings.'
    )
  }

  const client = getClient()
  const extension = mimeType.includes('webm')
    ? 'webm'
    : mimeType.includes('mp4')
      ? 'mp4'
      : mimeType.includes('mp3') || mimeType.includes('mpeg')
        ? 'mp3'
        : 'wav'

  try {
    const file = await toFile(audioBuffer, `answer.${extension}`, { type: mimeType })
    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1'
    })
    return transcription.text.trim()
  } catch (error) {
    logger.error('Speech transcription failed', error)
    if (error instanceof OpenAI.AuthenticationError) {
      throw new AIRequestError('The AI service rejected your API key. Please check it in Settings.')
    }
    throw new AIRequestError('We could not understand the recording. Please try again or type your answer.')
  }
}

/** Returns null (rather than throwing) when voice output is not available, so callers can silently fall back to browser speech. */
export async function synthesizeSpeech(text: string, voice: AiVoiceName): Promise<Buffer | null> {
  if (getAiStatus().usingMockAi) {
    return null
  }

  try {
    const client = getClient()
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text
    })
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    logger.error('Speech synthesis failed, falling back to browser voice', error)
    return null
  }
}
