import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { api } from '../services/electronApi'
import { useInterviewFlow } from '../state/InterviewFlowContext'

export default function ResumePreviewPage(): JSX.Element | null {
  const navigate = useNavigate()
  const { setup, resumeFilePath, resumeAnalysis, setResumeAnalysis } = useInterviewFlow()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!setup) {
      navigate('/setup')
      return
    }
    if (!resumeFilePath || resumeAnalysis) {
      return
    }

    setIsAnalyzing(true)
    setError(null)
    api.resume
      .analyze(resumeFilePath, setup.jobDescription)
      .then(setResumeAnalysis)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsAnalyzing(false))
  }, [setup, resumeFilePath, resumeAnalysis, navigate, setResumeAnalysis])

  if (!setup) {
    return null
  }

  const info = resumeAnalysis?.resumeInformation
  const jobMatch = resumeAnalysis?.jobMatch

  return (
    <div>
      <h1 className="page-title">Interview Preview</h1>
      <p className="page-subtitle">
        {setup.jobRole} · {setup.experienceLevel} · {setup.interviewType} · {setup.difficulty}
      </p>

      {!resumeFilePath && (
        <div className="banner banner--info">
          No resume was uploaded. The interview will be based on the selected role only.
        </div>
      )}

      {isAnalyzing && <p className="text-muted">Analyzing resume...</p>}

      {error && <div className="banner banner--danger">{error}</div>}

      {info && !isAnalyzing && (
        <div className="card stack">
          <div className="row row--space-between">
            <strong>Resume ready</strong>
            {info.name && <span className="text-muted">{info.name}</span>}
          </div>

          {info.summary && <p>{info.summary}</p>}

          <ResumeInfoRow label="Skills" items={info.skills} />
          <ResumeInfoRow label="Experience" items={info.experience} />
          <ResumeInfoRow label="Projects" items={info.projects} />
          <ResumeInfoRow label="Education" items={info.education} />
          <ResumeInfoRow label="Certifications" items={info.certifications} />
        </div>
      )}

      {jobMatch && (
        <div className="card stack">
          <strong>Job Description Match</strong>
          <ResumeInfoRow label="Matching skills" items={jobMatch.matchingSkills} />
          <ResumeInfoRow label="Skills to highlight or brush up on" items={jobMatch.missingSkills} />
        </div>
      )}

      <div className="row" style={{ marginTop: 20 }}>
        <Button variant="secondary" onClick={() => navigate('/setup')}>
          Back
        </Button>
        <Button onClick={() => navigate('/interview')} disabled={isAnalyzing}>
          Start Interview
        </Button>
      </div>
    </div>
  )
}

function ResumeInfoRow({ label, items }: { label: string; items: string[] }): JSX.Element | null {
  if (items.length === 0) {
    return null
  }
  return (
    <div>
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {label}
      </div>
      <div className="tag-list">
        {items.slice(0, 12).map((item, index) => (
          <span className="tag" key={index}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
