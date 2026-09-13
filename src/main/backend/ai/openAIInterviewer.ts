import OpenAI from 'openai'
import { logger } from '../../services/logger'
import { AIRequestError, AIResponseError } from './aiErrors'
import { parseJsonRecovering } from './jsonRecovery'
import {
  INTERVIEWER_SYSTEM_PROMPT,
  buildEvaluateAnswerPrompt,
  buildFinalReportPrompt,
  buildNextQuestionPrompt
} from './interviewerPrompt'
import type { AnswerContext, InterviewAI, InterviewContext } from './interviewAI'
import type {
  FinalReport,
  InterviewDifficulty,
  InterviewerEvaluationResponse,
  InterviewerQuestionResponse
} from '@shared/types'

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) {
    return fallback
  }
  return Math.min(max, Math.max(min, num))
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

const VALID_DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard']

function isInterviewDifficulty(value: unknown): value is InterviewDifficulty {
  return VALID_DIFFICULTIES.includes(value as InterviewDifficulty)
}

export class OpenAIInterviewer implements InterviewAI {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async createQuestion(context: InterviewContext): Promise<InterviewerQuestionResponse> {
    const raw = await this.requestJson(buildNextQuestionPrompt(context))
    const question = typeof raw.question === 'string' ? raw.question.trim() : ''
    if (!question) {
      throw new AIResponseError('The AI did not return a usable question.')
    }
    return {
      action: 'ask_question',
      question,
      topic: typeof raw.topic === 'string' && raw.topic.trim() ? raw.topic.trim() : 'General',
      difficulty: isInterviewDifficulty(raw.difficulty) ? raw.difficulty : context.state.setup.difficulty,
      reason: typeof raw.reason === 'string' ? raw.reason : ''
    }
  }

  async evaluateAnswer(context: AnswerContext): Promise<InterviewerEvaluationResponse> {
    const raw = await this.requestJson(buildEvaluateAnswerPrompt(context))
    return {
      action: 'evaluate_answer',
      score: clampNumber(raw.score, 0, 10, 5),
      technicalAccuracy: clampNumber(raw.technicalAccuracy, 0, 10, 5),
      relevance: clampNumber(raw.relevance, 0, 10, 5),
      communication: clampNumber(raw.communication, 0, 10, 5),
      strengths: toStringArray(raw.strengths),
      weaknesses: toStringArray(raw.weaknesses),
      followUpNeeded: Boolean(raw.followUpNeeded),
      followUpQuestion:
        typeof raw.followUpQuestion === 'string' && raw.followUpQuestion.trim()
          ? raw.followUpQuestion.trim()
          : null
    }
  }

  async createFinalReport(context: InterviewContext): Promise<FinalReport> {
    const raw = await this.requestJson(buildFinalReportPrompt(context))
    const scores = asRecord(raw.scores)
    return {
      scores: {
        overall: clampNumber(scores.overall, 0, 100, 50),
        technicalKnowledge: clampNumber(scores.technicalKnowledge, 0, 100, 50),
        problemSolving: clampNumber(scores.problemSolving, 0, 100, 50),
        communication: clampNumber(scores.communication, 0, 100, 50),
        confidence: clampNumber(scores.confidence, 0, 100, 50),
        resumeKnowledge: clampNumber(scores.resumeKnowledge, 0, 100, 50),
        roleReadiness: clampNumber(scores.roleReadiness, 0, 100, 50)
      },
      strengths: toStringArray(raw.strengths),
      weaknesses: toStringArray(raw.weaknesses),
      mostImportantMistakes: toStringArray(raw.mostImportantMistakes),
      questionsStruggled: toStringArray(raw.questionsStruggled),
      questionsPerformedWell: toStringArray(raw.questionsPerformedWell),
      recommendedTopics: toStringArray(raw.recommendedTopics),
      improvementPlan: toStringArray(raw.improvementPlan),
      // Populated by the interview engine after retrieval, not by the model itself.
      groundedResources: []
    }
  }

  private async requestJson(userPrompt: string): Promise<Record<string, unknown>> {
    let content: string | null | undefined

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: INTERVIEWER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
      content = completion.choices[0]?.message?.content
    } catch (error) {
      logger.error('OpenAI request failed', error)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new AIRequestError(
          'The AI service rejected your API key. Please check it in Settings.'
        )
      }
      throw new AIRequestError(
        "We couldn't connect to the AI service. Please check your internet connection and try again."
      )
    }

    if (!content) {
      throw new AIResponseError('The AI returned an empty response.')
    }

    try {
      return parseJsonRecovering(content)
    } catch (error) {
      logger.error('Could not parse AI response as JSON', content)
      throw error
    }
  }
}
