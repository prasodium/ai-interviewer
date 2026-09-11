import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { FinalReport, InterviewState } from '@shared/types'

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

function sampleState(id: string): InterviewState {
  return {
    interviewId: id,
    setup: {
      jobRole: 'Software Engineer',
      experienceLevel: 'Fresher',
      interviewType: 'Technical',
      difficulty: 'Medium',
      interviewStyle: 'Professional',
      lengthMinutes: 20,
      jobDescription: ''
    },
    currentQuestion: 'Tell me about yourself.',
    questionNumber: 1,
    totalQuestions: 5,
    questionsAsked: ['Tell me about yourself.'],
    currentTopic: 'Introduction',
    transcript: [{ speaker: 'interviewer', text: 'Tell me about yourself.', timestamp: new Date().toISOString() }],
    questionRecords: [],
    candidateScore: 0,
    interviewFinished: false,
    startedAt: new Date().toISOString(),
    completedAt: null
  }
}

function sampleFinalReport(): FinalReport {
  return {
    scores: {
      overall: 80,
      technicalKnowledge: 80,
      problemSolving: 80,
      communication: 80,
      confidence: 80,
      resumeKnowledge: 80,
      roleReadiness: 80
    },
    strengths: ['Clear communicator'],
    weaknesses: [],
    mostImportantMistakes: [],
    questionsStruggled: [],
    questionsPerformedWell: ['Tell me about yourself.'],
    recommendedTopics: [],
    improvementPlan: []
  }
}

describe('interviewRepository', () => {
  afterAll(() => {
    closeDatabase()
    rmSync(testDataDir, { recursive: true, force: true })
  })

  it('creates and retrieves an interview by id', () => {
    interviewRepository.createInterview(sampleState('int-1'), null, null)
    const loaded = interviewRepository.getInterviewState('int-1')
    expect(loaded?.interviewId).toBe('int-1')
    expect(loaded?.currentQuestion).toBe('Tell me about yourself.')
  })

  it('only lists interviews once they are finished', () => {
    interviewRepository.createInterview(sampleState('int-2'), null, null)
    expect(interviewRepository.listInterviews().some((i) => i.id === 'int-2')).toBe(false)

    interviewRepository.finishInterview('int-2', sampleFinalReport())
    expect(interviewRepository.listInterviews().some((i) => i.id === 'int-2')).toBe(true)
  })

  it('persists the final report and score for a finished interview', () => {
    interviewRepository.createInterview(sampleState('int-3'), null, null)
    interviewRepository.finishInterview('int-3', sampleFinalReport())

    const detail = interviewRepository.getInterviewDetail('int-3')
    expect(detail?.finalReport.scores.overall).toBe(80)
    expect(detail?.score).toBe(80)
  })

  it('deletes an interview permanently', () => {
    interviewRepository.createInterview(sampleState('int-4'), null, null)
    interviewRepository.finishInterview('int-4', sampleFinalReport())

    interviewRepository.deleteInterview('int-4')
    expect(interviewRepository.getInterviewDetail('int-4')).toBeNull()
  })

  it('clears all interviews', () => {
    interviewRepository.createInterview(sampleState('int-5'), null, null)
    interviewRepository.finishInterview('int-5', sampleFinalReport())

    interviewRepository.clearAllInterviews()
    expect(interviewRepository.listInterviews()).toEqual([])
  })
})
