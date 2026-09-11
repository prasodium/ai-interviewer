interface InterviewProgressProps {
  questionNumber: number
  totalQuestions: number
}

export default function InterviewProgress({ questionNumber, totalQuestions }: InterviewProgressProps): JSX.Element {
  const percent = Math.min(100, Math.round((questionNumber / totalQuestions) * 100))
  return (
    <span>
      Question {questionNumber} of {totalQuestions}
      <span className="score-bar" style={{ display: 'inline-block', width: 80, marginLeft: 8, verticalAlign: 'middle' }}>
        <span className="score-bar__fill" style={{ width: `${percent}%` }} />
      </span>
    </span>
  )
}
