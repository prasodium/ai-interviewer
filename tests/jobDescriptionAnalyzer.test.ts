import { describe, expect, it } from 'vitest'
import { analyzeJobDescription } from '../src/main/backend/resume/jobDescriptionAnalyzer'
import type { ResumeInformation } from '@shared/types'

const resumeInformation: ResumeInformation = {
  name: 'Jane Doe',
  summary: '',
  education: [],
  skills: ['Python', 'SQL', 'Kafka'],
  experience: [],
  projects: [],
  certifications: []
}

describe('analyzeJobDescription', () => {
  it('returns null when no job description is provided', () => {
    expect(analyzeJobDescription('', resumeInformation)).toBeNull()
    expect(analyzeJobDescription('   ', resumeInformation)).toBeNull()
  })

  it('finds skills the candidate already has', () => {
    const result = analyzeJobDescription('We need someone strong in Python and SQL.', resumeInformation)
    expect(result?.matchingSkills).toEqual(expect.arrayContaining(['python', 'sql']))
  })

  it('finds skills mentioned in the job description but missing from the resume', () => {
    const result = analyzeJobDescription('Experience with Kubernetes and Terraform is required.', resumeInformation)
    expect(result?.missingSkills).toEqual(expect.arrayContaining(['kubernetes', 'terraform']))
    expect(result?.matchingSkills).toEqual([])
  })
})
