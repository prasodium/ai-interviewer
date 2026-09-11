interface ScoreCardProps {
  label: string
  value: number
}

export default function ScoreCard({ label, value }: ScoreCardProps): JSX.Element {
  return (
    <div className="card score-card">
      <span className="text-muted" style={{ fontSize: 13 }}>
        {label}
      </span>
      <span className="score-card__value">{Math.round(value)}/100</span>
      <div className="score-bar">
        <div className="score-bar__fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}
