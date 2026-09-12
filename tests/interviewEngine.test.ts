import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { InterviewSetupOptions } from '@shared/types'

const testDataDir = mkdtempSync(join(tmpdir(), 'ai-interviewer-test-'))

vi.mock('electron', () => ({
  app: { getPath: () => testDataDir },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value, 'utf-8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf-8')
  }
}))

// There is no mock-AI fallback anymore - the interview engine always
// goes through OpenAI, so a canned chat.completions.create response
// stands in for the real API here. Which canned shape to return is
// picked by looking for each prompt's declared "action" (or the final
// report's distinctive "scores" field) in the user message.
const chatCompletionsCreateMock = vi.fn(async ({ messages }: { messages: { role: string; content: string }[] }) => {
  const userContent = messages.find((message) => message.role === 'user')?.content ?? ''
  let responseObject: Record<string, unknown>

  if (userContent.includes('"action": "ask_question"')) {
    responseObject = {
      action: 'ask_question',
      question: 'Can you describe a challenging bug you fixed recently?',
      topic: 'Debugging',
      difficulty: 'Medium',
      reason: 'Follow-up on general experience.'
    }
  } else if (userContent.includes('"action": "evaluate_answer"')) {
    responseObject = {
      action: 'evaluate_answer',
      score: 7,
      technicalAccuracy: 7,
      relevance: 7,
      communication: 7,
      strengths: ['Clear explanation'],
      weaknesses: [],
      followUpNeeded: false,
      followUpQuestion: null
    }
  } else {
    responseObject = {
      scores: {
        overall: 75,
        technicalKnowledge: 75,
        problemSolving: 75,
        communication: 75,
        confidence: 75,
        resumeKnowledge: 75,
        roleReadiness: 75
      },
      strengths: ['Solid fundamentals'],
      weaknesses: [],
      mostImportantMistakes: [],
      questionsStruggled: [],
      questionsPerformedWell: [],
      recommendedTopics: [],
      improvementPlan: ['Keep practicing system design']
    }
  }

  return { choices: [{ message: { content: JSON.stringify(responseObject) } }] }
})

vi.mock('openai', () => {
  class MockOpenAI {
    static AuthenticationError = class extends Error {}
    chat = { completions: { create: chatCompletionsCreateMock } }
  }
  return { default: MockOpenAI }
})

const { closeDatabase } = await import('../src/main/backend/database/db')
const interviewRepository = await import('../src/main/backend/database/interviewRepository')
const interviewEngine = await import('../src/main/backend/interview/interviewEngine')
const settingsService = await import('../src/main/services/settingsService')

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

describe('interview completion flow', () => {
  beforeAll(() => {
    settingsService.storeApiKey('sk-test-key')
  })

  afterAll(() => {
    closeDatabase()
    rmSync(testDataDir, { recursive: true, force: true })
  })

  it('always opens with a fixed personal icebreaker rather than an AI-chosen question', async () => {
    const started = await interviewEngine.startInterview(setup, null, null)
    expect(started.interviewerReply.toLowerCase()).toContain('tell me a bit about yourself')
    expect(started.state.currentTopic).toBe('Introduction')
    expect(chatCompletionsCreateMock).not.toHaveBeenCalled()
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

  it('fails clearly when no API key is configured', async () => {
    settingsService.clearApiKey()
    // Starting never calls the AI (the opening question is fixed), but
    // answering does, and should fail clearly without a key.
    const started = await interviewEngine.startInterview(setup, null, null)
    await expect(interviewEngine.submitAnswer(started.state.interviewId, DETAILED_ANSWER)).rejects.toThrow(
      /API key/
    )
    settingsService.storeApiKey('sk-test-key')
  })
})
