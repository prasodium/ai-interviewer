import { getDatabase } from './db'

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare<string, { value: string }>('SELECT value FROM settings WHERE key = ?').get(key)
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}
