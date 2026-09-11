import type { JobMatch, ResumeInformation } from '@shared/types'
import { KNOWN_SKILL_KEYWORDS } from './skillKeywords'

/**
 * Compares a job description against the candidate's resume using simple
 * keyword matching. This intentionally avoids an AI call - it only needs
 * to nudge the interviewer's topic selection, not produce a perfect
 * analysis.
 */
export function analyzeJobDescription(
  jobDescription: string,
  resumeInformation: ResumeInformation
): JobMatch | null {
  const trimmed = jobDescription.trim()
  if (!trimmed) {
    return null
  }

  const lowerJobDescription = trimmed.toLowerCase()
  const jobDescriptionSkills = KNOWN_SKILL_KEYWORDS.filter((keyword) =>
    lowerJobDescription.includes(keyword)
  )

  const resumeSkillsLower = new Set(resumeInformation.skills.map((skill) => skill.toLowerCase()))

  const matchingSkills = jobDescriptionSkills.filter((skill) => resumeSkillsLower.has(skill))
  const missingSkills = jobDescriptionSkills.filter((skill) => !resumeSkillsLower.has(skill))

  return {
    matchingSkills,
    missingSkills,
    importantTopics: jobDescriptionSkills.slice(0, 15)
  }
}
