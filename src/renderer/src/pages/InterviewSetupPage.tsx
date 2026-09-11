import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import JobRoleSelect from '../components/JobRoleSelect'
import ResumeUpload from '../components/ResumeUpload'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type {
  ExperienceLevel,
  InterviewDifficulty,
  InterviewLengthMinutes,
  InterviewStyle,
  InterviewType
} from '@shared/types'

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Student', 'Fresher', '0-2 years', '2-5 years', '5+ years']
const INTERVIEW_TYPES: InterviewType[] = ['Technical', 'HR', 'Mixed', 'Resume Focused']
const DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard']
const LENGTHS: InterviewLengthMinutes[] = [10, 20, 30, 45]
const STYLES: InterviewStyle[] = ['Friendly', 'Professional', 'Strict', 'FAANG-style']

export default function InterviewSetupPage(): JSX.Element {
  const navigate = useNavigate()
  const { setSetup, resumeFilePath, setResumeFilePath } = useInterviewFlow()

  const [selectedRole, setSelectedRole] = useState('Software Engineer')
  const [customRole, setCustomRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Fresher')
  const [interviewType, setInterviewType] = useState<InterviewType>('Mixed')
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium')
  const [lengthMinutes, setLengthMinutes] = useState<InterviewLengthMinutes>(20)
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('Professional')
  const [jobDescription, setJobDescription] = useState('')

  const jobRole = selectedRole === 'Other' ? customRole.trim() : selectedRole
  const canContinue = jobRole.length > 0

  function handleContinue(): void {
    setSetup({
      jobRole,
      experienceLevel,
      interviewType,
      difficulty,
      interviewStyle,
      lengthMinutes,
      jobDescription
    })
    navigate('/resume-preview')
  }

  return (
    <div>
      <h1 className="page-title">Interview Setup</h1>
      <p className="page-subtitle">Tell us about the interview you want to practice.</p>

      <div className="card">
        <JobRoleSelect
          selectedRole={selectedRole}
          customRole={customRole}
          onSelectedRoleChange={setSelectedRole}
          onCustomRoleChange={setCustomRole}
        />

        <div className="field-grid">
          <div className="field">
            <label htmlFor="experience">Experience</label>
            <select
              id="experience"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="interview-type">Interview Type</label>
            <select
              id="interview-type"
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value as InterviewType)}
            >
              {INTERVIEW_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as InterviewDifficulty)}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="length">Interview Length</label>
            <select
              id="length"
              value={lengthMinutes}
              onChange={(event) => setLengthMinutes(Number(event.target.value) as InterviewLengthMinutes)}
            >
              {LENGTHS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Interview Style</label>
          <div className="pill-group">
            {STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className="pill"
                aria-pressed={interviewStyle === style}
                onClick={() => setInterviewStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <ResumeUpload filePath={resumeFilePath} onFileSelected={setResumeFilePath} />

        <div className="field">
          <label htmlFor="job-description">Job Description (optional)</label>
          <textarea
            id="job-description"
            placeholder="Paste the job description to tailor questions to it"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <Button onClick={handleContinue} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
