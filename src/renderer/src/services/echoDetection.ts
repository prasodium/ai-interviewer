/**
 * Detects when a "transcribed answer" is actually just the AI's own
 * question bleeding back through the microphone (acoustic echo) rather
 * than a real spoken answer. This is a safety net independent of the
 * audio-level fixes (echo cancellation, settle buffer) - if the mic
 * picks up the question anyway on some hardware, we should not treat it
 * as a genuine answer.
 */
function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

const MINIMUM_ANSWER_WORDS = 4
const ECHO_OVERLAP_THRESHOLD = 0.7

export function isLikelyEchoOfQuestion(question: string, answer: string): boolean {
  const questionWords = new Set(normalizeWords(question))
  const answerWords = normalizeWords(answer)

  if (answerWords.length < MINIMUM_ANSWER_WORDS || questionWords.size === 0) {
    return false
  }

  const overlapping = answerWords.filter((word) => questionWords.has(word)).length
  const overlapRatio = overlapping / answerWords.length
  return overlapRatio > ECHO_OVERLAP_THRESHOLD
}
