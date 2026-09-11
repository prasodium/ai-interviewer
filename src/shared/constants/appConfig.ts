/**
 * Central place for branding and tunable limits so they are not
 * scattered across dozens of files.
 */
export const APP_NAME = 'AI Interviewer'

export const APP_TAGLINE = 'Practice realistic job interviews with an AI interviewer.'

/** Hard ceiling on questions per interview, regardless of configured length. */
export const MAX_INTERVIEW_QUESTIONS = 45

/** Candidate answers longer than this are truncated before being sent to the AI. */
export const MAX_ANSWER_CHARACTERS = 4000

/** Roughly how many questions fit in each configured interview length. */
export const QUESTIONS_PER_MINUTE = 1 / 2.5
