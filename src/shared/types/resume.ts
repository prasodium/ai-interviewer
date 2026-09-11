export interface ResumeInformation {
  name: string
  summary: string
  education: string[]
  skills: string[]
  experience: string[]
  projects: string[]
  certifications: string[]
}

export interface JobMatch {
  matchingSkills: string[]
  missingSkills: string[]
  importantTopics: string[]
}

export interface ResumeAnalysisResult {
  resumeText: string
  resumeInformation: ResumeInformation
  jobMatch: JobMatch | null
}
