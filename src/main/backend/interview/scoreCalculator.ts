import type { QuestionRecord } from '@shared/types'

/** Running score shown during the interview, on a 0-100 scale to match the final report. */
export function calculateRunningScore(questionRecords: QuestionRecord[]): number {
  if (questionRecords.length === 0) {
    return 0
  }
  const totalOutOfTen = questionRecords.reduce((sum, record) => sum + record.evaluation.score, 0)
  const averageOutOfTen = totalOutOfTen / questionRecords.length
  return Math.round(averageOutOfTen * 10)
}
