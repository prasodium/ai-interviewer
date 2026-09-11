import { useEffect, useRef } from 'react'
import type { InterviewMessage } from '@shared/types'

export default function TranscriptPanel({ messages }: { messages: InterviewMessage[] }): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  return (
    <div className="card interview-sidebar">
      <h3>Conversation</h3>
      <div className="transcript-panel">
        {messages.length === 0 && <p className="transcript-empty">The conversation will appear here.</p>}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`transcript-message transcript-message--${message.speaker}`}
          >
            {message.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
