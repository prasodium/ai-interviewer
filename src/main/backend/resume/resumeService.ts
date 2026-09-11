import type { ResumeAnalysisResult } from '@shared/types'
import { extractResumeText } from './resumeParser'
import { analyzeResumeText } from './resumeAnalyzer'
import { analyzeJobDescription } from './jobDescriptionAnalyzer'

export async function analyzeResume(
  filePath: string,
  jobDescription: string
): Promise<ResumeAnalysisResult> {
  const resumeText = await extractResumeText(filePath)
  const resumeInformation = analyzeResumeText(resumeText)
  const jobMatch = analyzeJobDescription(jobDescription, resumeInformation)

  return { resumeText, resumeInformation, jobMatch }
}
