import { describe, expect, it } from 'vitest'
import { MockInterviewer } from '../src/main/backend/ai/mockInterviewer'
import type { InterviewContext } from '../src/main/backend/ai/interviewAI'
import type { InterviewState } from '@shared/types'

function baseState(overrides: Partial<InterviewState> = {}): InterviewState {
  return {
    interviewId: 'test-id',
    setup: {
      jobRole: 'Data Engineer',
      experienceLevel: 'Fresher',
      interviewType: 'Mixed',
      difficulty: 'Medium',
      interviewStyle: 'Professional',
      lengthMinutes: 20,
      jobDescription: ''
    },
    currentQuestion: '',
    questionNumber: 1,
    totalQuestions: 8,
    questionsAsked: [],
    currentTopic: '',
    transcript: [],
    questionRecords: [],
    candidateScore: 0,
    interviewFinished: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides
  }
}

function context(overrides: Partial<InterviewState> = {}): InterviewContext {
  return {
    state: baseState(overrides),
    resumeInformation: null,
    jobMatch: null
  }
}

describe('MockInterviewer.createQuestion', () => {
  it('never repeats a question that has already been asked', async () => {
    const interviewer = new MockInterviewer()
    const askedQuestions: string[] = []
    const questionRecords: InterviewState['questionRecords'] = []

    for (let i = 0; i < 6; i += 1) {
      const result = await interviewer.createQuestion(
        context({ questionNumber: i + 1, questionsAsked: [...askedQuestions], questionRecords: [...questionRecords] })
      )
      expect(askedQuestions).not.toContain(result.question)
      askedQuestions.push(result.question)
      questionRecords.push({
        question: result.question,
        answer: 'some answer',
        topic: result.topic,
        evaluation: { score: 7, technicalAccuracy: 7, relevance: 7, communication: 7, strengths: [], weaknesses: [] }
      })
    }
  })
})

describe('MockInterviewer.evaluateAnswer', () => {
  const interviewer = new MockInterviewer()

  it('scores an "I don\'t know" answer low and does not ask a follow-up', async () => {
    const result = await interviewer.evaluateAnswer({ ...context(), answerText: "I don't know" })
    expect(result.score).toBeLessThanOrEqual(4)
    expect(result.followUpNeeded).toBe(false)
  })

  it('scores a detailed answer highly and suggests a follow-up', async () => {
    const longAnswer =
      'I designed a real-time data pipeline using Kafka for ingestion, Spark for stream processing, and S3 for ' +
      'durable storage, handling consumer failures with automatic group rebalancing and a dead-letter queue for ' +
      'poison messages, and I monitored end-to-end lag with a dedicated dashboard so we could catch backpressure early.'
    const result = await interviewer.evaluateAnswer({ ...context(), answerText: longAnswer })
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(result.followUpNeeded).toBe(true)
  })
})

describe('MockInterviewer.createFinalReport', () => {
  it('produces scores in the 0-100 range from question records', async () => {
    const interviewer = new MockInterviewer()
    const result = await interviewer.createFinalReport(
      context({
        questionRecords: [
          {
            question: 'Tell me about your project',
            answer: 'Detailed answer',
            topic: 'Projects',
            evaluation: { score: 9, technicalAccuracy: 9, relevance: 9, communication: 8, strengths: ['Clear'], weaknesses: [] }
          },
          {
            question: 'How does indexing work?',
            answer: 'Not sure',
            topic: 'Databases',
            evaluation: { score: 3, technicalAccuracy: 3, relevance: 3, communication: 4, strengths: [], weaknesses: ['Lacked detail'] }
          }
        ]
      })
    )

    expect(result.scores.overall).toBeGreaterThanOrEqual(0)
    expect(result.scores.overall).toBeLessThanOrEqual(100)
    expect(result.questionsPerformedWell).toContain('Tell me about your project')
    expect(result.questionsStruggled).toContain('How does indexing work?')
  })
})
