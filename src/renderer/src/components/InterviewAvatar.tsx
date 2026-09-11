export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking'

export default function InterviewAvatar({ state }: { state: AvatarState }): JSX.Element {
  return (
    <div className={`interview-avatar interview-avatar--${state}`} aria-hidden="true">
      <div className="interview-avatar__core" />
    </div>
  )
}
