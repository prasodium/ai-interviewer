export default function QuestionDisplay({ question }: { question: string }): JSX.Element {
  return (
    <p className="question-display" role="status">
      {question}
    </p>
  )
}
