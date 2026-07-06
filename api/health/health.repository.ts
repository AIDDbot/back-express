import { db } from "../../shared/db.js";

export function recordRun(): void {
  const INSERT = "INSERT INTO runs (started_at) VALUES (?)";
  db.prepare(INSERT).run(new Date().toISOString());
}

export function getRunsCount(): number {
  const SELECT = "SELECT COUNT(*) AS count FROM runs";
  const { count } = db.prepare(SELECT).get() as {
    count: number;
  };
  return count;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL
  )
`);
