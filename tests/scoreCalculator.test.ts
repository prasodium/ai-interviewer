import { describe, expect, it } from 'vitest'
import { calculateRunningScore } from '../src/main/backend/interview/scoreCalculator'
import type { QuestionRecord } from '@shared/types'

function record(score: number): QuestionRecord {
  return {
    question: 'q',
    answer: 'a',
    topic: 'General',
    evaluation: {
      score,
      technicalAccuracy: score,
      relevance: score,
      communication: score,
      strengths: [],
      weaknesses: []
    }
  }
}

describe('calculateRunningScore', () => {
  it('returns 0 when there are no answered questions yet', () => {
    expect(calculateRunningScore([])).toBe(0)
  })

  it('converts the average score out of 10 into a score out of 100', () => {
    expect(calculateRunningScore([record(8), record(6)])).toBe(70)
  })

  it('rounds to the nearest whole number', () => {
    expect(calculateRunningScore([record(7), record(7), record(8)])).toBe(73)
  })
})
