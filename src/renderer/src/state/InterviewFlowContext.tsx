import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { InterviewSetupOptions, ResumeAnalysisResult } from '@shared/types'

/**
 * Holds the in-progress interview setup as the user moves through
 * Setup -> Resume Preview -> Interview. Nothing here is persisted -
 * once the interview actually starts, the source of truth becomes the
 * saved interview in SQLite (accessed by interviewId).
 */
interface InterviewFlowState {
  setup: InterviewSetupOptions | null
  resumeFilePath: string | null
  resumeAnalysis: ResumeAnalysisResult | null
  activeInterviewId: string | null
  setSetup: (setup: InterviewSetupOptions) => void
  setResumeFilePath: (path: string | null) => void
  setResumeAnalysis: (analysis: ResumeAnalysisResult | null) => void
  setActiveInterviewId: (id: string | null) => void
  reset: () => void
}

const InterviewFlowContext = createContext<InterviewFlowState | null>(null)

export function InterviewFlowProvider({ children }: { children: ReactNode }): JSX.Element {
  const [setup, setSetup] = useState<InterviewSetupOptions | null>(null)
  const [resumeFilePath, setResumeFilePath] = useState<string | null>(null)
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisResult | null>(null)
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null)

  const value = useMemo<InterviewFlowState>(
    () => ({
      setup,
      resumeFilePath,
      resumeAnalysis,
      activeInterviewId,
      setSetup,
      setResumeFilePath,
      setResumeAnalysis,
      setActiveInterviewId,
      reset: () => {
        setSetup(null)
        setResumeFilePath(null)
        setResumeAnalysis(null)
        setActiveInterviewId(null)
      }
    }),
    [setup, resumeFilePath, resumeAnalysis, activeInterviewId]
  )

  return <InterviewFlowContext.Provider value={value}>{children}</InterviewFlowContext.Provider>
}

export function useInterviewFlow(): InterviewFlowState {
  const context = useContext(InterviewFlowContext)
  if (!context) {
    throw new Error('useInterviewFlow must be used within InterviewFlowProvider')
  }
  return context
}
