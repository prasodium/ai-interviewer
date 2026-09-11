import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { InterviewSetupOptions } from '@shared/types'

process.env.USE_MOCK_AI = 'true'

const testDataDir = mkdtempSync(join(tmpdir(), 'ai-interviewer-test-'))

vi.mock('electron', () => ({
  app: { getPath: () => testDataDir },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf-8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf-8')
  }
}))

const { closeDatabase } = await import('../src/main/backend/database/db')
const interviewRepository = await import('../src/main/backend/database/interviewRepository')
const interviewEngine = await import('../src/main/backend/interview/interviewEngine')

const setup: InterviewSetupOptions = {
  jobRole: 'Software Engineer',
  experienceLevel: 'Fresher',
  interviewType: 'Technical',
  difficulty: 'Easy',
  interviewStyle: 'Friendly',
  lengthMinutes: 10,
  jobDescription: ''
}

const DETAILED_ANSWER =
  'I built the feature by breaking it into small pieces, writing tests first, and reviewing the design with my team before implementation.'

describe('interview completion flow (mock AI)', () => {
  afterAll(() => {
    closeDatabase()
    rmSync(testDataDir, { recursive: true, force: true })
  })

  it('runs a full interview from start to a saved final report', async () => {
    const started = await interviewEngine.startInterview(setup, null, null)
    expect(started.state.questionNumber).toBe(1)
    expect(started.state.interviewFinished).toBe(false)
    expect(started.interviewerReply.length).toBeGreaterThan(0)

    let current = started.state
    let safetyCounter = 0

    while (!current.interviewFinished && safetyCounter < 20) {
      const result = await interviewEngine.submitAnswer(current.interviewId, DETAILED_ANSWER)
      current = result.state
      safetyCounter += 1
    }

    expect(current.interviewFinished).toBe(true)
    expect(current.questionRecords.length).toBe(current.totalQuestions)

    const finalReport = await interviewEngine.finishInterview(current.interviewId)
    expect(finalReport.scores.overall).toBeGreaterThanOrEqual(0)
    expect(finalReport.scores.overall).toBeLessThanOrEqual(100)

    const saved = interviewRepository.getInterviewDetail(current.interviewId)
    expect(saved?.finalReport.scores.overall).toBe(finalReport.scores.overall)
    expect(saved?.questionRecords.length).toBe(current.totalQuestions)
  })

  it('rejects answers submitted after the interview has already finished', async () => {
    const started = await interviewEngine.startInterview(setup, null, null)
    let current = started.state
    let safetyCounter = 0

    while (!current.interviewFinished && safetyCounter < 20) {
      const result = await interviewEngine.submitAnswer(current.interviewId, DETAILED_ANSWER)
      current = result.state
      safetyCounter += 1
    }

    await expect(interviewEngine.submitAnswer(current.interviewId, 'one more answer')).rejects.toThrow()
  })
})
