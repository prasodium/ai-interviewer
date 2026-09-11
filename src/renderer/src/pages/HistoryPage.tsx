import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { api } from '../services/electronApi'
import type { SavedInterview } from '@shared/types'

export default function HistoryPage(): JSX.Element {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState<SavedInterview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  function reload(): void {
    api.history.list().then((result) => {
      setInterviews(result)
      setIsLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleDelete(id: string): Promise<void> {
    const confirmed = window.confirm('Delete this interview permanently?')
    if (!confirmed) {
      return
    }
    await api.history.delete(id)
    reload()
  }

  async function handleClearAll(): Promise<void> {
    const confirmed = window.confirm('Delete all interview history? This cannot be undone.')
    if (!confirmed) {
      return
    }
    await api.history.clearAll()
    reload()
  }

  return (
    <div>
      <h1 className="page-title">Interview History</h1>
      <p className="page-subtitle">Review your past interviews and track your progress.</p>

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && interviews.length === 0 && (
        <div className="empty-state">
          <p>No interviews yet.</p>
          <Button onClick={() => navigate('/setup')}>Start Your First Interview</Button>
        </div>
      )}

      <div className="stack">
        {interviews.map((interview) => (
          <div key={interview.id} className="card row row--space-between">
            <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/results/${interview.id}`)}>
              <div style={{ fontWeight: 600 }}>{interview.jobRole}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {new Date(interview.startedAt).toLocaleDateString()} · {interview.interviewType}
              </div>
            </div>
            <div className="row">
              <span style={{ fontWeight: 700 }}>{Math.round(interview.score)}/100</span>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleDelete(interview.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {interviews.length > 0 && (
        <div className="row" style={{ marginTop: 20 }}>
          <Button variant="danger" onClick={handleClearAll}>
            Clear All History
          </Button>
        </div>
      )}
    </div>
  )
}
