interface MicrophoneButtonProps {
  isListening: boolean
  disabled: boolean
  onClick: () => void
}

export default function MicrophoneButton({ isListening, disabled, onClick }: MicrophoneButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="mic-button"
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop recording your answer' : 'Start recording your answer'}
      disabled={disabled}
      onClick={onClick}
    >
      {isListening ? '■' : '🎙'}
    </button>
  )
}
