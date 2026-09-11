import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import ReportSection from '../components/ReportSection'
import ScoreCard from '../components/ScoreCard'
import { api } from '../services/electronApi'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type { SavedInterviewDetail } from '@shared/types'

export default function ResultsPage(): JSX.Element {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const { reset } = useInterviewFlow()
  const [detail, setDetail] = useState<SavedInterviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!interviewId) {
      return
    }
    api.history.get(interviewId).then((result) => {
      setDetail(result)
      setIsLoading(false)
    })
  }, [interviewId])

  if (isLoading) {
    return <p className="text-muted">Loading your results...</p>
  }

  if (!detail) {
    return (
      <div className="empty-state">
        <p>We could not find this interview's report.</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    )
  }

  const { scores } = detail.finalReport

  return (
    <div>
      <h1 className="page-title">Interview Result</h1>
      <p className="page-subtitle">
        {detail.jobRole} · {new Date(detail.startedAt).toLocaleDateString()}
      </p>

      <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="text-muted" style={{ fontSize: 13 }}>
          Overall Score
        </div>
        <div style={{ fontSize: 48, fontWeight: 700 }}>{Math.round(scores.overall)}/100</div>
      </div>

      <div className="score-grid" style={{ marginBottom: 24 }}>
        <ScoreCard label="Technical Knowledge" value={scores.technicalKnowledge} />
        <ScoreCard label="Problem Solving" value={scores.problemSolving} />
        <ScoreCard label="Communication" value={scores.communication} />
        <ScoreCard label="Confidence" value={scores.confidence} />
        <ScoreCard label="Resume Knowledge" value={scores.resumeKnowledge} />
        <ScoreCard label="Role Readiness" value={scores.roleReadiness} />
      </div>

      <div className="stack">
        <ReportSection title="What you did well" items={detail.finalReport.strengths} />
        <ReportSection title="What needs improvement" items={detail.finalReport.weaknesses} />
        <ReportSection title="Most important mistakes" items={detail.finalReport.mostImportantMistakes} />
        <ReportSection title="Recommended topics to study" items={detail.finalReport.recommendedTopics} />
        <ReportSection title="Recommended next steps" items={detail.finalReport.improvementPlan} />
      </div>

      {detail.questionRecords.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Question by Question</h3>
          <div className="stack">
            {detail.questionRecords.map((record, index) => (
              <div key={index} style={{ borderTop: index > 0 ? '1px solid var(--color-border)' : 'none', paddingTop: index > 0 ? 16 : 0 }}>
                <div className="row row--space-between">
                  <strong>{record.question}</strong>
                  <span className="text-muted">{record.evaluation.score}/10</span>
                </div>
                {record.evaluation.strengths[0] && (
                  <p style={{ margin: '6px 0 0' }} className="text-muted">
                    Strength: {record.evaluation.strengths[0]}
                  </p>
                )}
                {record.evaluation.weaknesses[0] && (
                  <p style={{ margin: '2px 0 0' }} className="text-muted">
                    Weakness: {record.evaluation.weaknesses[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <Button
          onClick={() => {
            reset()
            navigate('/setup')
          }}
        >
          Start Another Interview
        </Button>
        <Button variant="secondary" onClick={() => navigate('/history')}>
          View History
        </Button>
      </div>
    </div>
  )
}
