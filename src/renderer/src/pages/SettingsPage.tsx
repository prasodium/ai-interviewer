import { useEffect, useState } from 'react'
import Button from '../components/Button'
import { speechSynthesisService } from '../services/speechSynthesisService'
import { api } from '../services/electronApi'
import type {
  AiStatus,
  AppSettings,
  InterviewDifficulty,
  InterviewLengthMinutes,
  InterviewStyle
} from '@shared/types'

const STYLES: InterviewStyle[] = ['Friendly', 'Professional', 'Strict', 'FAANG-style']
const DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard']
const LENGTHS: InterviewLengthMinutes[] = [10, 20, 30, 45]

export default function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    api.settings.get().then(setSettings)
    api.settings.getAiStatus().then(setAiStatus)

    function loadVoices(): void {
      setVoices(speechSynthesisService.getAvailableVoices())
    }
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
  }, [])

  function flashSaved(): void {
    setSavedMessage('Saved')
    setTimeout(() => setSavedMessage(''), 1500)
  }

  async function updateSetting(partial: Partial<AppSettings>): Promise<void> {
    const updated = await api.settings.update(partial)
    setSettings(updated)
    flashSaved()
  }

  async function handleSaveApiKey(): Promise<void> {
    if (!apiKeyInput.trim()) {
      return
    }
    await api.settings.setApiKey({ apiKey: apiKeyInput.trim() })
    setApiKeyInput('')
    const [nextSettings, nextStatus] = await Promise.all([api.settings.get(), api.settings.getAiStatus()])
    setSettings(nextSettings)
    setAiStatus(nextStatus)
    flashSaved()
  }

  async function handleClearApiKey(): Promise<void> {
    await api.settings.clearApiKey()
    const [nextSettings, nextStatus] = await Promise.all([api.settings.get(), api.settings.getAiStatus()])
    setSettings(nextSettings)
    setAiStatus(nextStatus)
    flashSaved()
  }

  async function handleClearHistory(): Promise<void> {
    if (!window.confirm('Delete all saved interviews? This cannot be undone.')) {
      return
    }
    await api.history.clearAll()
    flashSaved()
  }

  async function handleResetAllData(): Promise<void> {
    if (
      !window.confirm(
        'Reset the app completely? This deletes all interview history, your API key, and your preferences.'
      )
    ) {
      return
    }
    await api.settings.resetAllData()
    const [nextSettings, nextStatus] = await Promise.all([api.settings.get(), api.settings.getAiStatus()])
    setSettings(nextSettings)
    setAiStatus(nextStatus)
    flashSaved()
  }

  if (!settings) {
    return <p className="text-muted">Loading settings...</p>
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">{savedMessage}</p>

      {aiStatus && (
        <div className={`banner ${aiStatus.usingMockAi ? 'banner--warning' : 'banner--info'}`}>
          {aiStatus.usingMockAi
            ? 'Using the built-in mock interviewer. Add an OpenAI API key below to use real AI-generated questions.'
            : 'Connected to OpenAI. Your resume and answers are sent to OpenAI to generate interview questions and feedback.'}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>OpenAI API Key</h3>
        <p className="text-muted" style={{ fontSize: 13 }}>
          {settings.hasApiKey ? 'An API key is currently configured.' : 'No API key configured yet.'}
        </p>
        <div className="row">
          <input
            type="password"
            placeholder="sk-..."
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>
            Save
          </Button>
          {settings.hasApiKey && (
            <Button variant="secondary" onClick={handleClearApiKey}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Voice</h3>
        <div className="field">
          <label htmlFor="voice-select">Voice</label>
          <select
            id="voice-select"
            value={settings.voiceName ?? ''}
            onChange={(event) => updateSetting({ voiceName: event.target.value || null })}
          >
            <option value="">System default</option>
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="voice-speed">Voice speed ({settings.voiceSpeed.toFixed(1)}x)</label>
            <input
              id="voice-speed"
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={settings.voiceSpeed}
              onChange={(event) => updateSetting({ voiceSpeed: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="voice-volume">Voice volume ({Math.round(settings.voiceVolume * 100)}%)</label>
            <input
              id="voice-volume"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={settings.voiceVolume}
              onChange={(event) => updateSetting({ voiceVolume: Number(event.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Interview Defaults</h3>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="default-style">Preferred interview style</label>
            <select
              id="default-style"
              value={settings.preferredInterviewStyle}
              onChange={(event) => updateSetting({ preferredInterviewStyle: event.target.value as InterviewStyle })}
            >
              {STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="default-difficulty">Default difficulty</label>
            <select
              id="default-difficulty"
              value={settings.defaultDifficulty}
              onChange={(event) => updateSetting({ defaultDifficulty: event.target.value as InterviewDifficulty })}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="default-length">Default interview length</label>
            <select
              id="default-length"
              value={settings.defaultLengthMinutes}
              onChange={(event) =>
                updateSetting({ defaultLengthMinutes: Number(event.target.value) as InterviewLengthMinutes })
              }
            >
              {LENGTHS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Data Management</h3>
        <p className="text-muted" style={{ fontSize: 13 }}>
          Resumes and interview transcripts are stored only on this device.
        </p>
        <div className="row">
          <Button variant="danger" onClick={handleClearHistory}>
            Clear Interview History
          </Button>
          <Button variant="danger" onClick={handleResetAllData}>
            Reset Application Data
          </Button>
        </div>
      </div>
    </div>
  )
}
