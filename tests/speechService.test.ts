import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const testDataDir = mkdtempSync(join(tmpdir(), 'ai-interviewer-test-'))

vi.mock('electron', () => ({
  app: { getPath: () => testDataDir },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf-8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf-8')
  }
}))

const transcriptionsCreateMock = vi.fn()
const speechCreateMock = vi.fn()

class MockAuthenticationError extends Error {}

vi.mock('openai', () => {
  class MockOpenAI {
    static AuthenticationError = MockAuthenticationError
    audio = {
      transcriptions: { create: transcriptionsCreateMock },
      speech: { create: speechCreateMock }
    }
  }
  return {
    default: MockOpenAI,
    toFile: vi.fn(async (buffer: Buffer, filename: string) => ({ buffer, filename }))
  }
})

const { closeDatabase } = await import('../src/main/backend/database/db')
const settingsService = await import('../src/main/services/settingsService')
const speechService = await import('../src/main/backend/ai/speechService')
const { AIRequestError } = await import('../src/main/backend/ai/aiErrors')

describe('speechService', () => {
  afterAll(() => {
    closeDatabase()
    rmSync(testDataDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    transcriptionsCreateMock.mockReset()
    speechCreateMock.mockReset()
    delete process.env.USE_MOCK_AI
  })

  it('refuses to transcribe in mock mode, keeping it free', async () => {
    process.env.USE_MOCK_AI = 'true'
    await expect(speechService.transcribeAudio(Buffer.from('audio'), 'audio/webm')).rejects.toThrow(AIRequestError)
    expect(transcriptionsCreateMock).not.toHaveBeenCalled()
  })

  it('transcribes audio using the configured API key', async () => {
    settingsService.storeApiKey('sk-test')
    transcriptionsCreateMock.mockResolvedValue({ text: '  hello there  ' })

    const text = await speechService.transcribeAudio(Buffer.from('audio'), 'audio/webm')

    expect(text).toBe('hello there')
    expect(transcriptionsCreateMock).toHaveBeenCalledWith(expect.objectContaining({ model: 'whisper-1' }))
  })

  it('raises a friendly error when the API key is rejected', async () => {
    settingsService.storeApiKey('sk-bad')
    transcriptionsCreateMock.mockRejectedValue(new MockAuthenticationError('bad key'))

    await expect(speechService.transcribeAudio(Buffer.from('audio'), 'audio/webm')).rejects.toThrow(
      /rejected your API key/
    )
  })

  it('returns null for speech synthesis in mock mode instead of calling OpenAI', async () => {
    process.env.USE_MOCK_AI = 'true'
    settingsService.storeApiKey('sk-test')

    const result = await speechService.synthesizeSpeech('Hello', 'alloy')

    expect(result).toBeNull()
    expect(speechCreateMock).not.toHaveBeenCalled()
  })

  it('synthesizes speech and returns audio bytes when a real key is configured', async () => {
    settingsService.storeApiKey('sk-test')
    const fakeAudio = new Uint8Array([1, 2, 3]).buffer
    speechCreateMock.mockResolvedValue({ arrayBuffer: async () => fakeAudio })

    const result = await speechService.synthesizeSpeech('Hello', 'nova')

    expect(result).toEqual(Buffer.from([1, 2, 3]))
    expect(speechCreateMock).toHaveBeenCalledWith(expect.objectContaining({ voice: 'nova', model: 'tts-1' }))
  })

  it('falls back to null instead of throwing when speech synthesis fails', async () => {
    settingsService.storeApiKey('sk-test')
    speechCreateMock.mockRejectedValue(new Error('network down'))

    const result = await speechService.synthesizeSpeech('Hello', 'alloy')

    expect(result).toBeNull()
  })
})
