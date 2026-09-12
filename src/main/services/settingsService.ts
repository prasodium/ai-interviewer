import { safeStorage } from 'electron'
import { getSetting, setSetting, deleteSetting } from '../backend/database/settingsRepository'
import { clearAllInterviews } from '../backend/database/interviewRepository'
import { logger } from './logger'
import type { AiStatus, AppSettings } from '@shared/types'

const SETTINGS_KEY = 'app_settings'
const API_KEY_SETTING = 'openai_api_key_encrypted'

const DEFAULT_SETTINGS: Omit<AppSettings, 'hasApiKey'> = {
  voiceSpeed: 1,
  voiceVolume: 1,
  aiVoice: 'alloy',
  preferredInterviewStyle: 'Professional',
  defaultDifficulty: 'Medium',
  defaultLengthMinutes: 20
}

function readStoredSettings(): Omit<AppSettings, 'hasApiKey'> {
  const raw = getSetting(SETTINGS_KEY)
  if (!raw) {
    return DEFAULT_SETTINGS
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function getSettings(): AppSettings {
  return { ...readStoredSettings(), hasApiKey: hasStoredApiKey() }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = readStoredSettings()
  const { hasApiKey: _ignored, ...safePartial } = partial
  const next = { ...current, ...safePartial }
  setSetting(SETTINGS_KEY, JSON.stringify(next))
  return { ...next, hasApiKey: hasStoredApiKey() }
}

/**
 * API keys are encrypted with the OS keychain (via Electron's safeStorage)
 * before ever touching disk, and are never written to plain log files.
 */
export function storeApiKey(apiKey: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn('OS-level encryption is unavailable; storing API key without encryption')
    setSetting(API_KEY_SETTING, Buffer.from(apiKey, 'utf-8').toString('base64'))
    return
  }
  const encrypted = safeStorage.encryptString(apiKey)
  setSetting(API_KEY_SETTING, encrypted.toString('base64'))
}

export function getApiKey(): string | null {
  const stored = getSetting(API_KEY_SETTING)
  if (!stored) {
    return null
  }
  const buffer = Buffer.from(stored, 'base64')
  if (!safeStorage.isEncryptionAvailable()) {
    return buffer.toString('utf-8')
  }
  try {
    return safeStorage.decryptString(buffer)
  } catch (error) {
    logger.error('Failed to decrypt stored API key', error)
    return null
  }
}

export function clearApiKey(): void {
  deleteSetting(API_KEY_SETTING)
}

/** Wipes everything the app has stored: interview history, the API key, and preferences. */
export function resetAllData(): void {
  clearAllInterviews()
  deleteSetting(API_KEY_SETTING)
  deleteSetting(SETTINGS_KEY)
}

function hasStoredApiKey(): boolean {
  return Boolean(getApiKey() || process.env.OPENAI_API_KEY)
}

export function getAiStatus(): AiStatus {
  return { hasApiKey: hasStoredApiKey() }
}

/** Resolves the effective API key: explicit setting first, then env var. */
export function resolveApiKey(): string | null {
  return getApiKey() ?? process.env.OPENAI_API_KEY ?? null
}
