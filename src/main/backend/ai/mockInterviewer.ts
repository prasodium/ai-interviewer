import { getTopicsForRole } from '@shared/constants/jobRoles'
import type { AnswerContext, InterviewAI, InterviewContext } from './interviewAI'
import type {
  FinalReport,
  InterviewDifficulty,
  InterviewerEvaluationResponse,
  InterviewerQuestionResponse
} from '@shared/types'

const QUESTION_TEMPLATES: Record<string, string[]> = {
  Behavioral: [
    'Tell me about a time you disagreed with a teammate. How did you handle it?',
    'Describe a project that did not go as planned. What did you learn?'
  ],
  Projects: [
    'Tell me about {project}. What was your role in it?',
    'What was the most challenging part of building {project}?'
  ],
  'System Design': [
    'How would you design a system that needs to handle a sudden 10x spike in traffic?',
    'Walk me through how you would design a URL shortening service.'
  ],
  Databases: [
    'Suppose a SQL query becomes slow as a table grows. How would you investigate it?',
    'When would you choose a NoSQL database over a relational one?'
  ],
  SQL: [
    'Suppose a SQL query becomes slow as a table grows. How would you investigate it?',
    'How would you find duplicate rows in a large table efficiently?'
  ]
}

const GENERIC_FOLLOW_UPS = {
  strong: 'Let\'s take that one step further - how would you scale this to handle much higher load?',
  weak: 'Let\'s simplify it. What would be the main components involved?',
  vague: 'Can you be more specific about what exactly you changed and why?'
}

function pickSkillToAskAbout(context: InterviewContext): string | null {
  const skills = context.resumeInformation?.skills ?? []
  const alreadyAsked = context.state.questionsAsked.join(' ').toLowerCase()
  return skills.find((skill) => !alreadyAsked.includes(skill.toLowerCase())) ?? null
}

function pickProjectToAskAbout(context: InterviewContext): string | null {
  const projects = context.resumeInformation?.projects ?? []
  const alreadyAsked = context.state.questionsAsked.join(' ').toLowerCase()
  return projects.find((project) => !alreadyAsked.includes(project.slice(0, 20).toLowerCase())) ?? null
}

function chooseNextTopic(context: InterviewContext): string {
  const topics = getTopicsForRole(context.state.setup.jobRole)
  const askedTopics = new Set(
    context.state.questionRecords.map((record) => record.topic)
  )
  return topics.find((topic) => !askedTopics.has(topic)) ?? topics[context.state.questionNumber % topics.length]
}

function adaptiveDifficulty(context: InterviewContext): InterviewDifficulty {
  const recentScores = context.state.questionRecords.slice(-2).map((record) => record.evaluation.score)
  if (recentScores.length === 0) {
    return context.state.setup.difficulty
  }
  const average = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length
  if (average >= 8) return 'Hard'
  if (average <= 4) return 'Easy'
  return 'Medium'
}

/**
 * A canned, resume-aware interviewer used when no API key is configured
 * or USE_MOCK_AI=true. Lets the full UI and interview flow be built and
 * tested without spending anything on the OpenAI API.
 */
export class MockInterviewer implements InterviewAI {
  async createQuestion(context: InterviewContext): Promise<InterviewerQuestionResponse> {
    const { state } = context

    if (state.questionNumber === 1) {
      return {
        action: 'ask_question',
        question: `Tell me about yourself and your experience relevant to the ${state.setup.jobRole} role.`,
        topic: 'Introduction',
        difficulty: state.setup.difficulty,
        reason: 'Opening question to let the candidate introduce themselves.'
      }
    }

    const project = pickProjectToAskAbout(context)
    if (project && state.questionRecords.length < 3) {
      return {
        action: 'ask_question',
        question: `You listed this on your resume: "${project}". Can you walk me through it?`,
        topic: 'Projects',
        difficulty: adaptiveDifficulty(context),
        reason: 'Verifying a project claim from the resume.'
      }
    }

    const topic = chooseNextTopic(context)
    const templates = QUESTION_TEMPLATES[topic]
    const skill = pickSkillToAskAbout(context)

    let question: string
    if (templates) {
      question = templates[state.questionNumber % templates.length].replace('{project}', project ?? 'your project')
    } else if (skill) {
      question = `You mentioned ${skill} on your resume. Can you describe a situation where you used it to solve a real problem?`
    } else {
      question = `Let's talk about ${topic}. Can you describe your experience with it?`
    }

    return {
      action: 'ask_question',
      question,
      topic,
      difficulty: adaptiveDifficulty(context),
      reason: `Continuing with the ${topic} topic for a ${state.setup.jobRole} interview.`
    }
  }

  async evaluateAnswer(context: AnswerContext): Promise<InterviewerEvaluationResponse> {
    const trimmed = context.answerText.trim()
    const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
    const isDontKnow = /\b(i don't know|not sure|no idea|dont know)\b/i.test(trimmed)

    if (isDontKnow || wordCount === 0) {
      return {
        action: 'evaluate_answer',
        score: 3,
        technicalAccuracy: 3,
        relevance: 4,
        communication: 5,
        strengths: [],
        weaknesses: ['Did not provide a substantive answer'],
        followUpNeeded: false,
        followUpQuestion: null
      }
    }

    if (wordCount < 12) {
      return {
        action: 'evaluate_answer',
        score: 5,
        technicalAccuracy: 5,
        relevance: 6,
        communication: 5,
        strengths: ['Attempted to address the question'],
        weaknesses: ['Answer lacked detail and specific examples'],
        followUpNeeded: true,
        followUpQuestion: GENERIC_FOLLOW_UPS.vague
      }
    }

    if (wordCount < 40) {
      return {
        action: 'evaluate_answer',
        score: 7,
        technicalAccuracy: 7,
        relevance: 7,
        communication: 7,
        strengths: ['Gave a reasonable, relevant explanation'],
        weaknesses: ['Could include more concrete detail'],
        followUpNeeded: context.state.questionNumber % 2 === 0,
        followUpQuestion: GENERIC_FOLLOW_UPS.weak
      }
    }

    return {
      action: 'evaluate_answer',
      score: 8.5,
      technicalAccuracy: 8.5,
      relevance: 8.5,
      communication: 8,
      strengths: ['Detailed, well-structured answer'],
      weaknesses: [],
      followUpNeeded: true,
      followUpQuestion: GENERIC_FOLLOW_UPS.strong
    }
  }

  async createFinalReport(context: InterviewContext): Promise<FinalReport> {
    const records = context.state.questionRecords

    const averageOutOfTen = (values: number[]): number => {
      if (values.length === 0) return 6.5
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }
    const toPercent = (average: number): number => Math.round(average * 10)

    const overall = toPercent(averageOutOfTen(records.map((record) => record.evaluation.score)))
    const strong = records.filter((record) => record.evaluation.score >= 7.5)
    const weak = records.filter((record) => record.evaluation.score < 6)

    return {
      scores: {
        overall,
        technicalKnowledge: toPercent(averageOutOfTen(records.map((r) => r.evaluation.technicalAccuracy))),
        problemSolving: overall,
        communication: toPercent(averageOutOfTen(records.map((r) => r.evaluation.communication))),
        confidence: overall,
        resumeKnowledge: overall,
        roleReadiness: overall
      },
      strengths: strong.slice(0, 3).map((record) => `Strong answer on ${record.topic}`),
      weaknesses: weak.slice(0, 3).map((record) => `Needs improvement on ${record.topic}`),
      mostImportantMistakes: weak.slice(0, 2).map((record) => record.evaluation.weaknesses[0] ?? `Weak answer on ${record.topic}`),
      questionsStruggled: weak.map((record) => record.question),
      questionsPerformedWell: strong.map((record) => record.question),
      recommendedTopics: weak.slice(0, 3).map((record) => record.topic),
      improvementPlan: [
        'Practice explaining projects with more concrete technical detail.',
        'Review the topics you scored lowest on.',
        'Practice answering out loud to improve pacing and confidence.'
      ]
    }
  }
}
