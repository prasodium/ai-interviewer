/**
 * Small logging wrapper so we never accidentally log secrets or full
 * resume/interview content. Keep this simple - a file-based logger can
 * be swapped in later without changing call sites.
 */
const PREFIX = '[AI Interviewer]'

export const logger = {
  info(message: string, ...details: unknown[]): void {
    console.log(`${PREFIX} ${message}`, ...details)
  },
  warn(message: string, ...details: unknown[]): void {
    console.warn(`${PREFIX} ${message}`, ...details)
  },
  error(message: string, error?: unknown): void {
    console.error(`${PREFIX} ${message}`, error instanceof Error ? error.message : error)
  }
}
