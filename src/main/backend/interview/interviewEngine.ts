import { v4 as uuidv4 } from 'uuid'
import { MAX_ANSWER_CHARACTERS, MAX_INTERVIEW_QUESTIONS, QUESTIONS_PER_MINUTE } from '@shared/constants/appConfig'
import { getInterviewAI } from '../ai/aiFactory'
import type { AnswerContext, InterviewContext } from '../ai/interviewAI'
import * as interviewRepository from '../database/interviewRepository'
import { calculateRunningScore } from './scoreCalculator'
import type {
  FinalReport,
  InterviewMessage,
  InterviewSetupOptions,
  InterviewState,
  JobMatch,
  QuestionRecord,
  ResumeInformation
} from '@shared/types'

export class InterviewNotFoundError extends Error {}
export class InterviewAlreadyFinishedError extends Error {}

const MINIMUM_QUESTIONS = 5

function computeTotalQuestions(lengthMinutes: number): number {
  const estimated = Math.round(lengthMinutes * QUESTIONS_PER_MINUTE)
  return Math.min(MAX_INTERVIEW_QUESTIONS, Math.max(MINIMUM_QUESTIONS, estimated))
}

function nowIso(): string {
  return new Date().toISOString()
}

function addMessage(state: InterviewState, speaker: InterviewMessage['speaker'], text: string): void {
  state.transcript.push({ speaker, text, timestamp: nowIso() })
}

interface InterviewSession {
  state: InterviewState
  resumeInformation: ResumeInformation | null
  jobMatch: JobMatch | null
}

function loadSession(interviewId: string): InterviewSession {
  const state = interviewRepository.getInterviewState(interviewId)
  if (!state) {
    throw new InterviewNotFoundError('This interview could not be found.')
  }
  const detail = interviewRepository.getInterviewDetail(interviewId)
  return {
    state,
    resumeInformation: detail?.resumeInformation ?? null,
    jobMatch: detail?.jobMatch ?? null
  }
}

function toContext(session: InterviewSession): InterviewContext {
  return {
    state: session.state,
    resumeInformation: session.resumeInformation,
    jobMatch: session.jobMatch
  }
}

export interface StartInterviewResult {
  state: InterviewState
  interviewerReply: string
}

export async function startInterview(
  setup: InterviewSetupOptions,
  resumeInformation: ResumeInformation | null,
  jobMatch: JobMatch | null
): Promise<StartInterviewResult> {
  const state: InterviewState = {
    interviewId: uuidv4(),
    setup,
    currentQuestion: '',
    questionNumber: 1,
    totalQuestions: computeTotalQuestions(setup.lengthMinutes),
    questionsAsked: [],
    currentTopic: '',
    transcript: [],
    questionRecords: [],
    candidateScore: 0,
    interviewFinished: false,
    startedAt: nowIso(),
    completedAt: null
  }

  const ai = getInterviewAI()
  const context: InterviewContext = { state, resumeInformation, jobMatch }
  const questionResponse = await ai.createQuestion(context)

  state.currentQuestion = questionResponse.question
  state.currentTopic = questionResponse.topic
  state.questionsAsked.push(questionResponse.question)
  addMessage(state, 'interviewer', questionResponse.question)

  interviewRepository.createInterview(state, resumeInformation, jobMatch)

  return { state, interviewerReply: questionResponse.question }
}

const CLOSING_MESSAGE = 'That concludes the interview. Thank you.'

export interface AnswerResult {
  state: InterviewState
  interviewerReply: string
}

export async function submitAnswer(interviewId: string, answerText: string): Promise<AnswerResult> {
  const session = loadSession(interviewId)
  const { state } = session

  if (state.interviewFinished) {
    throw new InterviewAlreadyFinishedError('This interview has already finished.')
  }

  const truncatedAnswer = answerText.trim().slice(0, MAX_ANSWER_CHARACTERS)
  addMessage(state, 'candidate', truncatedAnswer || '(no answer given)')

  const ai = getInterviewAI()
  const answerContext: AnswerContext = { ...toContext(session), answerText: truncatedAnswer }
  const evaluation = await ai.evaluateAnswer(answerContext)

  const record: QuestionRecord = {
    question: state.currentQuestion,
    answer: truncatedAnswer,
    topic: state.currentTopic,
    evaluation: {
      score: evaluation.score,
      technicalAccuracy: evaluation.technicalAccuracy,
      relevance: evaluation.relevance,
      communication: evaluation.communication,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses
    }
  }
  state.questionRecords.push(record)
  state.candidateScore = calculateRunningScore(state.questionRecords)

  const reachedQuestionLimit = state.questionRecords.length >= state.totalQuestions

  let interviewerReply: string

  if (!reachedQuestionLimit && evaluation.followUpNeeded && evaluation.followUpQuestion) {
    state.questionNumber += 1
    state.currentQuestion = evaluation.followUpQuestion
    state.questionsAsked.push(evaluation.followUpQuestion)
    interviewerReply = evaluation.followUpQuestion
    addMessage(state, 'interviewer', interviewerReply)
  } else if (reachedQuestionLimit) {
    state.interviewFinished = true
    state.completedAt = nowIso()
    state.currentQuestion = ''
    interviewerReply = CLOSING_MESSAGE
    addMessage(state, 'interviewer', interviewerReply)
  } else {
    const questionResponse = await ai.createQuestion(toContext(session))
    state.questionNumber += 1
    state.currentQuestion = questionResponse.question
    state.currentTopic = questionResponse.topic
    state.questionsAsked.push(questionResponse.question)
    interviewerReply = questionResponse.question
    addMessage(state, 'interviewer', interviewerReply)
  }

  interviewRepository.saveInterviewState(state)

  return { state, interviewerReply }
}

export async function finishInterview(interviewId: string): Promise<FinalReport> {
  const session = loadSession(interviewId)
  const { state } = session

  if (!state.interviewFinished) {
    state.interviewFinished = true
    state.completedAt = nowIso()
    state.currentQuestion = ''
  }

  const ai = getInterviewAI()
  const finalReport = await ai.createFinalReport(toContext(session))

  interviewRepository.saveInterviewState(state)
  interviewRepository.finishInterview(interviewId, finalReport)

  return finalReport
}

export function getInterviewState(interviewId: string): InterviewState | null {
  return interviewRepository.getInterviewState(interviewId)
}
