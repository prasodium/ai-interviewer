import type { ResumeInformation, JobMatch } from './resume'

export type ExperienceLevel = 'Student' | 'Fresher' | '0-2 years' | '2-5 years' | '5+ years'

export type InterviewType = 'Technical' | 'HR' | 'Mixed' | 'Resume Focused'

export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard'

export type InterviewStyle = 'Friendly' | 'Professional' | 'Strict' | 'FAANG-style'

export type InterviewLengthMinutes = 10 | 20 | 30 | 45

export interface InterviewSetupOptions {
  jobRole: string
  experienceLevel: ExperienceLevel
  interviewType: InterviewType
  difficulty: InterviewDifficulty
  interviewStyle: InterviewStyle
  lengthMinutes: InterviewLengthMinutes
  jobDescription: string
}

export interface InterviewMessage {
  speaker: 'interviewer' | 'candidate'
  text: string
  timestamp: string
}

export interface AnswerEvaluation {
  score: number
  technicalAccuracy: number
  relevance: number
  communication: number
  strengths: string[]
  weaknesses: string[]
}

/** One evaluated question/answer pair, kept for the question-by-question report. */
export interface QuestionRecord {
  question: string
  answer: string
  topic: string
  evaluation: AnswerEvaluation
}

export interface InterviewState {
  interviewId: string
  setup: InterviewSetupOptions

  currentQuestion: string
  questionNumber: number
  totalQuestions: number

  questionsAsked: string[]
  currentTopic: string

  transcript: InterviewMessage[]
  questionRecords: QuestionRecord[]

  candidateScore: number
  interviewFinished: boolean

  startedAt: string
  completedAt: string | null
}

/** The AI's decision after asking a question: what to ask, and why. */
export interface InterviewerQuestionResponse {
  action: 'ask_question'
  question: string
  topic: string
  difficulty: InterviewDifficulty
  reason: string
}

/** The AI's decision after evaluating a candidate's answer. */
export interface InterviewerEvaluationResponse {
  action: 'evaluate_answer'
  score: number
  technicalAccuracy: number
  relevance: number
  communication: number
  strengths: string[]
  weaknesses: string[]
  followUpNeeded: boolean
  followUpQuestion: string | null
}

export interface FinalReportScores {
  overall: number
  technicalKnowledge: number
  problemSolving: number
  communication: number
  confidence: number
  resumeKnowledge: number
  roleReadiness: number
}

/** A curated study note retrieved (via embedding similarity search) for the candidate's weaker topics. */
export interface GroundedResource {
  title: string
  topic: string
  content: string
}

export interface FinalReport {
  scores: FinalReportScores
  strengths: string[]
  weaknesses: string[]
  mostImportantMistakes: string[]
  questionsStruggled: string[]
  questionsPerformedWell: string[]
  recommendedTopics: string[]
  improvementPlan: string[]
  /** Populated by retrieval after the AI generates the report - not something the model produces itself. */
  groundedResources: GroundedResource[]
}

export interface SavedInterview {
  id: string
  jobRole: string
  interviewType: InterviewType
  score: number
  startedAt: string
  completedAt: string
}

export interface SavedInterviewDetail extends SavedInterview {
  setup: InterviewSetupOptions
  transcript: InterviewMessage[]
  questionRecords: QuestionRecord[]
  finalReport: FinalReport
  resumeInformation: ResumeInformation | null
  jobMatch: JobMatch | null
}
