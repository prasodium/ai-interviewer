import OpenAI, { toFile } from 'openai'
import { logger } from '../../services/logger'
import { resolveApiKey } from '../../services/settingsService'
import { AIRequestError } from './aiErrors'
import type { AiVoiceName } from '@shared/types'

/**
 * Speech in this app goes entirely through OpenAI rather than the
 * browser's built-in speech APIs, for a concrete reason: Electron's
 * bundled Chromium does not implement SpeechRecognition (speech-to-text)
 * at all - it depends on a private Google service that only official
 * Chrome ships credentials for. SpeechSynthesis (text-to-speech) does
 * technically work in Electron, but sounds noticeably robotic compared
 * to OpenAI's TTS voices. Both directions therefore require a real
 * OpenAI API key - there is no local/free fallback.
 */

function getClient(): OpenAI {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new AIRequestError('Voice features need an OpenAI API key. Please add one in Settings.')
  }
  return new OpenAI({ apiKey })
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
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

export async function synthesizeSpeech(text: string, voice: AiVoiceName, speed: number): Promise<Buffer> {
  const client = getClient()
  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed
    })
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    logger.error('Speech synthesis failed', error)
    if (error instanceof OpenAI.AuthenticationError) {
      throw new AIRequestError('The AI service rejected your API key. Please check it in Settings.')
    }
    throw new AIRequestError("We couldn't generate speech for this question. Please check your connection.")
  }
}
