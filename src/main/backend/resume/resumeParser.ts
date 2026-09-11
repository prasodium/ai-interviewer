import { readFile } from 'fs/promises'
// pdf-parse ships as CommonJS with no clean ESM types; requiring the
// library entrypoint directly avoids it trying to load its own test fixtures.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

export class ResumeParsingError extends Error {}

/**
 * Extracts raw text from a resume PDF, entirely on-device. Nothing here
 * touches the network - text extraction should never require sending the
 * file anywhere.
 */
export async function extractResumeText(filePath: string): Promise<string> {
  let fileBuffer: Buffer
  try {
    fileBuffer = await readFile(filePath)
  } catch {
    throw new ResumeParsingError('We could not read the selected file. Please choose a valid PDF.')
  }

  try {
    const parsed = await pdfParse(fileBuffer)
    const text = parsed.text.trim()
    if (!text) {
      throw new ResumeParsingError(
        'This PDF does not contain any readable text. Scanned image resumes are not supported yet.'
      )
    }
    return text
  } catch (error) {
    if (error instanceof ResumeParsingError) {
      throw error
    }
    throw new ResumeParsingError('We could not read this PDF. Please try a different file.')
  }
}
