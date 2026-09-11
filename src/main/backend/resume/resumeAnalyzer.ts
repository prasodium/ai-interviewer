import type { ResumeInformation } from '@shared/types'
import { KNOWN_SKILL_KEYWORDS } from './skillKeywords'

const SECTION_HEADERS: Record<keyof Omit<ResumeInformation, 'name' | 'summary'>, string[]> = {
  education: ['education', 'academic background'],
  skills: ['skills', 'technical skills', 'technologies'],
  experience: ['experience', 'work experience', 'employment history', 'professional experience'],
  projects: ['projects', 'personal projects', 'academic projects'],
  certifications: ['certifications', 'certificates', 'licenses']
}

const SUMMARY_HEADERS = ['summary', 'objective', 'about', 'profile']

/**
 * Best-effort local extraction of structured resume information. This
 * runs entirely on-device with simple heuristics (no AI call) so that
 * uploading a resume never costs anything. Sections that cannot be
 * confidently detected are simply left empty, per the resume schema
 * design goal of staying simple rather than guessing aggressively.
 */
export function analyzeResumeText(resumeText: string): ResumeInformation {
  const lines = resumeText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const sections = splitIntoSections(lines)

  return {
    name: guessName(lines),
    summary: joinSectionLines(sections.get('summary') ?? []),
    education: bulletize(sections.get('education') ?? []),
    skills: extractSkillList(sections.get('skills') ?? [], resumeText),
    experience: bulletize(sections.get('experience') ?? []),
    projects: bulletize(sections.get('projects') ?? []),
    certifications: bulletize(sections.get('certifications') ?? [])
  }
}

function matchSectionKey(line: string): string | null {
  const normalized = line.toLowerCase().replace(/[^a-z ]/g, '').trim()
  if (normalized.length === 0 || normalized.length > 40) {
    return null
  }
  if (SUMMARY_HEADERS.includes(normalized)) {
    return 'summary'
  }
  for (const [key, headers] of Object.entries(SECTION_HEADERS)) {
    if (headers.includes(normalized)) {
      return key
    }
  }
  return null
}

function splitIntoSections(lines: string[]): Map<string, string[]> {
  const sections = new Map<string, string[]>()
  let currentSection: string | null = null

  for (const line of lines) {
    const matchedSection = matchSectionKey(line)
    if (matchedSection) {
      currentSection = matchedSection
      if (!sections.has(currentSection)) {
        sections.set(currentSection, [])
      }
      continue
    }
    if (currentSection) {
      sections.get(currentSection)!.push(line)
    }
  }

  return sections
}

function guessName(lines: string[]): string {
  const firstLine = lines[0] ?? ''
  const looksLikeContactLine = /[@\d]/.test(firstLine)
  if (firstLine.length > 0 && firstLine.length < 60 && !looksLikeContactLine) {
    return firstLine
  }
  return ''
}

function joinSectionLines(lines: string[]): string {
  return lines.slice(0, 6).join(' ')
}

function bulletize(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split(/(?<=[.;])\s+/))
    .map((item) => item.replace(/^[-•*•]\s*/, '').trim())
    .filter((item) => item.length > 2)
}

function extractSkillList(skillLines: string[], fullResumeText: string): string[] {
  const fromSection = skillLines
    .join(', ')
    .split(/[,;|••]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length < 40)

  if (fromSection.length > 0) {
    return Array.from(new Set(fromSection))
  }

  // No dedicated skills section - fall back to scanning the whole resume
  // for known technical keywords so the interview can still be tailored.
  const lowerText = fullResumeText.toLowerCase()
  const found = KNOWN_SKILL_KEYWORDS.filter((keyword) => lowerText.includes(keyword))
  return Array.from(new Set(found))
}
