import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const testDataDir = mkdtempSync(join(tmpdir(), 'ai-interviewer-test-'))

// Simulates a real OS keychain: encryptString/decryptString round-trip
// through a reversible transform instead of just passing text through,
// so the test actually exercises the encrypt/decrypt call sites.
vi.mock('electron', () => ({
  app: { getPath: () => testDataDir },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`, 'utf-8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf-8').replace(/^encrypted:/, '')
  }
}))

const { closeDatabase } = await import('../src/main/backend/database/db')
const settingsService = await import('../src/main/services/settingsService')

describe('settingsService API key persistence', () => {
  afterAll(() => {
    closeDatabase()
    rmSync(testDataDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('reports no API key before anything is saved', () => {
    expect(settingsService.getAiStatus()).toEqual({ hasApiKey: false })
  })

  it('stores an API key encrypted and reads it back correctly', () => {
    settingsService.storeApiKey('sk-test-12345')
    expect(settingsService.getApiKey()).toBe('sk-test-12345')
    expect(settingsService.resolveApiKey()).toBe('sk-test-12345')
  })

  it('survives a simulated app restart (closing and reopening the database)', () => {
    settingsService.storeApiKey('sk-persisted-key')
    closeDatabase()

    // A fresh call re-opens the same on-disk database file, exactly like
    // the next time the app is launched.
    expect(settingsService.getApiKey()).toBe('sk-persisted-key')
    expect(settingsService.getAiStatus().hasApiKey).toBe(true)
  })

  it('keeps using the saved key until the user explicitly changes or removes it', () => {
    settingsService.storeApiKey('sk-first-key')
    expect(settingsService.resolveApiKey()).toBe('sk-first-key')

    settingsService.storeApiKey('sk-second-key')
    expect(settingsService.resolveApiKey()).toBe('sk-second-key')

    settingsService.clearApiKey()
    expect(settingsService.getApiKey()).toBeNull()
    expect(settingsService.getAiStatus()).toEqual({ hasApiKey: false })
  })

  it('resetAllData removes the saved API key and preferences', () => {
    settingsService.storeApiKey('sk-to-be-reset')
    settingsService.updateSettings({ voiceSpeed: 1.4 })

    settingsService.resetAllData()

    expect(settingsService.getApiKey()).toBeNull()
    expect(settingsService.getSettings().voiceSpeed).toBe(1)
  })
})
