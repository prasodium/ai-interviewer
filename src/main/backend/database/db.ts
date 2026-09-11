import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { logger } from '../../services/logger'

let database: Database.Database | null = null

/**
 * Opens (or creates) the SQLite database in the platform-appropriate
 * application data directory, e.g. ~/Library/Application Support on
 * macOS or %APPDATA% on Windows. Never store the database next to the
 * executable - it would be lost on reinstall and may not be writable.
 */
export function getDatabase(): Database.Database {
  if (database) {
    return database
  }

  const dbPath = join(app.getPath('userData'), 'ai-interviewer.sqlite')
  database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  runMigrations(database)
  logger.info('Database ready at', dbPath)
  return database
}

export function closeDatabase(): void {
  database?.close()
  database = null
}

/**
 * The full transcript, question-by-question records, and final report all
 * live as JSON inside a single interview row. They are always read and
 * written together (never queried individually), so splitting them into
 * separate normalized tables would only add join complexity with no
 * benefit - see AI Interviewer rule "keep the database simple".
 */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      job_role TEXT NOT NULL,
      interview_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      experience_level TEXT NOT NULL,
      interview_style TEXT NOT NULL,
      length_minutes INTEGER NOT NULL,
      job_description TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      state_json TEXT NOT NULL,
      final_report_json TEXT,
      resume_information_json TEXT,
      job_match_json TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
