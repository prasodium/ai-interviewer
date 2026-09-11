import { useEffect, useState } from 'react'

interface InterviewTimerProps {
  startedAt: string
  lengthMinutes: number
  onTimeUp: () => void
}

function formatRemaining(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const minutes = Math.floor(clamped / 60)
  const remainingSeconds = clamped % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function InterviewTimer({ startedAt, lengthMinutes, onTimeUp }: InterviewTimerProps): JSX.Element {
  const endTime = new Date(startedAt).getTime() + lengthMinutes * 60 * 1000
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.round((endTime - Date.now()) / 1000)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = Math.round((endTime - Date.now()) / 1000)
      setRemainingSeconds(secondsLeft)
      if (secondsLeft <= 0) {
        onTimeUp()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime, onTimeUp])

  return <span>{formatRemaining(remainingSeconds)} remaining</span>
}
