import { getDatabase } from './db'
import type {
  FinalReport,
  InterviewState,
  JobMatch,
  ResumeInformation,
  SavedInterview,
  SavedInterviewDetail
} from '@shared/types'

export function createInterview(
  state: InterviewState,
  resumeInformation: ResumeInformation | null,
  jobMatch: JobMatch | null
): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO interviews (
      id, job_role, interview_type, difficulty, experience_level, interview_style,
      length_minutes, job_description, score, started_at, completed_at, state_json,
      resume_information_json, job_match_json
    ) VALUES (@id, @jobRole, @interviewType, @difficulty, @experienceLevel, @interviewStyle,
      @lengthMinutes, @jobDescription, @score, @startedAt, @completedAt, @stateJson,
      @resumeInformationJson, @jobMatchJson)`
  ).run({
    id: state.interviewId,
    jobRole: state.setup.jobRole,
    interviewType: state.setup.interviewType,
    difficulty: state.setup.difficulty,
    experienceLevel: state.setup.experienceLevel,
    interviewStyle: state.setup.interviewStyle,
    lengthMinutes: state.setup.lengthMinutes,
    jobDescription: state.setup.jobDescription,
    score: state.candidateScore,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    stateJson: JSON.stringify(state),
    resumeInformationJson: resumeInformation ? JSON.stringify(resumeInformation) : null,
    jobMatchJson: jobMatch ? JSON.stringify(jobMatch) : null
  })
}

export function saveInterviewState(state: InterviewState): void {
  const db = getDatabase()
  db.prepare(
    `UPDATE interviews
     SET score = @score, completed_at = @completedAt, state_json = @stateJson
     WHERE id = @id`
  ).run({
    id: state.interviewId,
    score: state.candidateScore,
    completedAt: state.completedAt,
    stateJson: JSON.stringify(state)
  })
}

export function finishInterview(interviewId: string, finalReport: FinalReport): void {
  const db = getDatabase()
  db.prepare(
    `UPDATE interviews
     SET final_report_json = ?, score = ?, completed_at = ?
     WHERE id = ?`
  ).run(JSON.stringify(finalReport), finalReport.scores.overall, new Date().toISOString(), interviewId)
}

export function getInterviewState(interviewId: string): InterviewState | null {
  const db = getDatabase()
  const row = db
    .prepare<string, { state_json: string }>('SELECT state_json FROM interviews WHERE id = ?')
    .get(interviewId)
  return row ? (JSON.parse(row.state_json) as InterviewState) : null
}

interface InterviewRow {
  id: string
  job_role: string
  interview_type: string
  score: number
  started_at: string
  completed_at: string | null
}

export function listInterviews(): SavedInterview[] {
  const db = getDatabase()
  const rows = db
    .prepare<[], InterviewRow>(
      `SELECT id, job_role, interview_type, score, started_at, completed_at
       FROM interviews
       WHERE completed_at IS NOT NULL
       ORDER BY started_at DESC`
    )
    .all()

  return rows.map((row) => ({
    id: row.id,
    jobRole: row.job_role,
    interviewType: row.interview_type as SavedInterview['interviewType'],
    score: row.score,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? ''
  }))
}

interface InterviewDetailRow extends InterviewRow {
  state_json: string
  final_report_json: string | null
  resume_information_json: string | null
  job_match_json: string | null
}

export function getInterviewDetail(interviewId: string): SavedInterviewDetail | null {
  const db = getDatabase()
  const row = db
    .prepare<string, InterviewDetailRow>('SELECT * FROM interviews WHERE id = ?')
    .get(interviewId)

  if (!row || !row.final_report_json) {
    return null
  }

  const state = JSON.parse(row.state_json) as InterviewState

  return {
    id: row.id,
    jobRole: row.job_role,
    interviewType: row.interview_type as SavedInterviewDetail['interviewType'],
    score: row.score,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? '',
    setup: state.setup,
    transcript: state.transcript,
    questionRecords: state.questionRecords,
    finalReport: JSON.parse(row.final_report_json) as FinalReport,
    resumeInformation: row.resume_information_json
      ? (JSON.parse(row.resume_information_json) as ResumeInformation)
      : null,
    jobMatch: row.job_match_json ? (JSON.parse(row.job_match_json) as JobMatch) : null
  }
}

export function deleteInterview(interviewId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM interviews WHERE id = ?').run(interviewId)
}

export function clearAllInterviews(): void {
  const db = getDatabase()
  db.exec('DELETE FROM interviews')
}
