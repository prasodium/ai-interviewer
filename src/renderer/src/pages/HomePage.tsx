import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { api } from '../services/electronApi'
import { APP_NAME, APP_TAGLINE } from '@shared/constants/appConfig'
import { useInterviewFlow } from '../state/InterviewFlowContext'
import type { SavedInterview } from '@shared/types'

export default function HomePage(): JSX.Element {
  const navigate = useNavigate()
  const { reset } = useInterviewFlow()
  const [recentInterview, setRecentInterview] = useState<SavedInterview | null>(null)

  useEffect(() => {
    api.history.list().then((interviews) => {
      setRecentInterview(interviews[0] ?? null)
    })
  }, [])

  function startNewInterview(): void {
    reset()
    navigate('/setup')
  }

  return (
    <div>
      <h1 className="page-title">{APP_NAME}</h1>
      <p className="page-subtitle">{APP_TAGLINE}</p>

      <div className="row">
        <Button onClick={startNewInterview}>Start New Interview</Button>
        <Button variant="secondary" onClick={() => navigate('/history')}>
          Interview History
        </Button>
      </div>

      {recentInterview && (
        <div className="card" style={{ marginTop: 32, maxWidth: 360 }}>
          <p className="text-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
            Recent interview
          </p>
          <div className="row row--space-between">
            <div>
              <div style={{ fontWeight: 600 }}>{recentInterview.jobRole}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {new Date(recentInterview.startedAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{Math.round(recentInterview.score)}/100</div>
          </div>
        </div>
      )}
    </div>
  )
}
