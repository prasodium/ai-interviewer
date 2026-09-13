import type {
  FinalReport,
  InterviewState,
  InterviewerEvaluationResponse,
  InterviewerQuestionResponse,
  JobMatch,
  ResumeInformation
} from '@shared/types'
import type { KnowledgeBaseDocument } from '../rag/retriever'

export interface InterviewContext {
  state: InterviewState
  resumeInformation: ResumeInformation | null
  jobMatch: JobMatch | null
  /** Retrieved (RAG) study notes for the candidate's weaker topics - only populated for createFinalReport. */
  relevantStudyNotes?: KnowledgeBaseDocument[]
}

export interface AnswerContext extends InterviewContext {
  answerText: string
}

/**
 * The seam between the interview engine and whichever AI implementation
 * is active. Swapping OpenAI for a local model later only means adding a
 * new class here - nothing else in the app needs to change.
 */
export interface InterviewAI {
  createQuestion(context: InterviewContext): Promise<InterviewerQuestionResponse>
  evaluateAnswer(context: AnswerContext): Promise<InterviewerEvaluationResponse>
  createFinalReport(context: InterviewContext): Promise<FinalReport>
}
