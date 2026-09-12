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

/**
 * OpenAI's Whisper model is well known to "hallucinate" stock outro
 * phrases like these when fed silence or near-silent audio (it was
 * trained on a lot of video/vlog transcripts). Treated as a sign the mic
 * didn't actually capture an answer, not as a real one.
 */
const KNOWN_SILENCE_HALLUCINATIONS = [
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  'dont forget to subscribe',
  'see you next time',
  'bye bye',
  'thanks for listening',
  'thank you for listening',
  'thank you'
]

export function isLikelySilenceHallucination(answer: string): boolean {
  const normalized = answer
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
  return KNOWN_SILENCE_HALLUCINATIONS.includes(normalized)
}
