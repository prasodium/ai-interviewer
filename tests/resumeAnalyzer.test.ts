import { describe, expect, it } from 'vitest'
import { analyzeResumeText } from '../src/main/backend/resume/resumeAnalyzer'

const SAMPLE_RESUME = `Jane Doe

Summary
Backend engineer with 3 years of experience building data pipelines.

Skills
Python, SQL, Kafka, Spark, AWS

Experience
Built a real-time IoT data pipeline processing 10k events per second.
Maintained ETL jobs that reduced processing time by 40%.

Projects
Real-time IoT data pipeline using Kafka and Spark.

Education
B.S. in Computer Science, State University

Certifications
AWS Certified Solutions Architect
`

describe('analyzeResumeText', () => {
  it('extracts the candidate name from the first line', () => {
    const result = analyzeResumeText(SAMPLE_RESUME)
    expect(result.name).toBe('Jane Doe')
  })

  it('extracts skills listed under the Skills section', () => {
    const result = analyzeResumeText(SAMPLE_RESUME)
    expect(result.skills).toEqual(expect.arrayContaining(['Python', 'SQL', 'Kafka', 'Spark', 'AWS']))
  })

  it('extracts experience and project bullet points', () => {
    const result = analyzeResumeText(SAMPLE_RESUME)
    expect(result.experience.length).toBeGreaterThan(0)
    expect(result.projects.length).toBeGreaterThan(0)
  })

  it('leaves sections empty when they cannot be found', () => {
    const result = analyzeResumeText('John Smith\n\nJust a name and nothing else.')
    expect(result.education).toEqual([])
    expect(result.certifications).toEqual([])
  })

  it('falls back to keyword scanning when there is no dedicated skills section', () => {
    const result = analyzeResumeText('Alex Lee\n\nWorked extensively with React and Docker on cloud projects.')
    expect(result.skills).toEqual(expect.arrayContaining(['react', 'docker']))
  })
})
