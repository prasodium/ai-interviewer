import { getTopicsForRole } from '@shared/constants/jobRoles'
import type { AnswerContext, InterviewContext } from './interviewAI'

/**
 * The interviewer's persona and rules, kept in one place instead of
 * inline inside a component or a request builder. This is sent as the
 * system message on every request.
 */
export const INTERVIEWER_SYSTEM_PROMPT = `You are a professional, experienced human job interviewer conducting a realistic spoken job interview.

You have access to the candidate's resume, the job description (if provided), the interview type, experience level, difficulty, and style, plus the questions already asked.

Your responsibilities:
1. Ask one question at a time.
2. Keep questions short and suitable for spoken conversation.
3. Use the candidate's resume when appropriate, and verify claims from it.
4. Ask questions relevant to the selected job role and, if given, the job description.
5. Ask follow-up questions when an answer deserves deeper investigation.
6. Challenge vague answers - if the candidate gives a suspiciously vague answer about a resume project, ask for specifics.
7. Do not reveal the expected answer and do not coach the candidate during the interview.
8. Do not repeat a question that has already been asked.
9. Increase difficulty when the candidate performs well, and reduce it when they struggle.
10. Maintain a realistic interviewer personality matching the requested interview style.
11. Do not provide a final evaluation until the interview is finished.
12. Do not turn the interview into a casual conversation, and avoid fake encouragement like "Great answer!".
13. Ask behavioral questions when appropriate for the interview type.
14. Focus on understanding the candidate's actual knowledge and experience.

Always respond with a single JSON object matching the schema you are given. Never include commentary outside the JSON object.`

function formatList(items: string[], limit = 12): string {
  if (items.length === 0) {
    return 'none listed'
  }
  return items.slice(0, limit).join(', ')
}

/**
 * A compact, reusable summary of the resume and job match. Built once
 * per request from already-extracted data - never re-sends the original
 * PDF or a long transcript.
 */
function buildCandidateProfileBlock(context: InterviewContext): string {
  const { resumeInformation, jobMatch } = context

  if (!resumeInformation) {
    return 'No resume was provided.'
  }

  const lines = [
    `Candidate summary: ${resumeInformation.summary || 'not provided'}`,
    `Skills: ${formatList(resumeInformation.skills)}`,
    `Experience: ${formatList(resumeInformation.experience, 6)}`,
    `Projects: ${formatList(resumeInformation.projects, 6)}`,
    `Education: ${formatList(resumeInformation.education, 4)}`,
    `Certifications: ${formatList(resumeInformation.certifications, 4)}`
  ]

  if (jobMatch) {
    lines.push(`Skills matching the job description: ${formatList(jobMatch.matchingSkills)}`)
    lines.push(`Skills from the job description the candidate did not mention: ${formatList(jobMatch.missingSkills)}`)
  }

  return lines.join('\n')
}

function buildInterviewSetupBlock(context: InterviewContext): string {
  const { setup } = context.state
  const topics = getTopicsForRole(setup.jobRole)

  const lines = [
    `Job role: ${setup.jobRole}`,
    `Candidate experience level: ${setup.experienceLevel}`,
    `Interview type: ${setup.interviewType}`,
    `Current difficulty: ${setup.difficulty}`,
    `Interviewer style: ${setup.interviewStyle}`,
    `Relevant topics for this role: ${formatList(topics, 20)}`
  ]

  if (setup.jobDescription.trim()) {
    lines.push(`Job description (may be truncated): ${setup.jobDescription.trim().slice(0, 1500)}`)
  }

  return lines.join('\n')
}

function buildProgressBlock(context: InterviewContext): string {
  const { state } = context
  const recentScores = state.questionRecords
    .slice(-3)
    .map((record) => `${record.topic}: ${record.evaluation.score}/10`)

  return [
    `Question ${state.questionNumber} of ${state.totalQuestions}.`,
    `Questions already asked: ${formatList(state.questionsAsked, 30)}`,
    `Current topic: ${state.currentTopic || 'none yet'}`,
    `Recent scores (use these to adapt difficulty): ${formatList(recentScores, 3)}`
  ].join('\n')
}

export function buildNextQuestionPrompt(context: InterviewContext): string {
  return `${buildInterviewSetupBlock(context)}

${buildCandidateProfileBlock(context)}

${buildProgressBlock(context)}

Ask the next interview question. Respond ONLY with JSON in this exact shape:
{
  "action": "ask_question",
  "question": "the question, phrased for spoken conversation",
  "topic": "short topic label, e.g. Kafka, System Design, Behavioral",
  "difficulty": "Easy" | "Medium" | "Hard",
  "reason": "one short sentence on why you chose this question"
}`
}

export function buildEvaluateAnswerPrompt(context: AnswerContext): string {
  return `${buildInterviewSetupBlock(context)}

${buildCandidateProfileBlock(context)}

${buildProgressBlock(context)}

The candidate was just asked:
"${context.state.currentQuestion}"

The candidate answered:
"${context.answerText}"

Evaluate this answer and decide if a follow-up question is warranted before moving to a new topic. Respond ONLY with JSON in this exact shape:
{
  "action": "evaluate_answer",
  "score": 0-10,
  "technicalAccuracy": 0-10,
  "relevance": 0-10,
  "communication": 0-10,
  "strengths": ["short phrase", "..."],
  "weaknesses": ["short phrase", "..."],
  "followUpNeeded": true | false,
  "followUpQuestion": "a specific follow-up question, or null if not needed"
}`
}

export function buildFinalReportPrompt(context: InterviewContext): string {
  const { state } = context
  const questionSummaries = state.questionRecords
    .map(
      (record, index) =>
        `${index + 1}. [${record.topic}] Q: ${record.question}\n   A: ${record.answer}\n   Score: ${record.evaluation.score}/10`
    )
    .join('\n')

  return `${buildInterviewSetupBlock(context)}

${buildCandidateProfileBlock(context)}

The interview is complete. Here is the full question-by-question record:
${questionSummaries || 'No questions were answered.'}

Produce a final interview report. Respond ONLY with JSON in this exact shape:
{
  "scores": {
    "overall": 0-100,
    "technicalKnowledge": 0-100,
    "problemSolving": 0-100,
    "communication": 0-100,
    "confidence": 0-100,
    "resumeKnowledge": 0-100,
    "roleReadiness": 0-100
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "mostImportantMistakes": ["..."],
  "questionsStruggled": ["..."],
  "questionsPerformedWell": ["..."],
  "recommendedTopics": ["..."],
  "improvementPlan": ["short actionable step", "..."]
}`
}
