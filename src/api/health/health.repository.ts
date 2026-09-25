import { getDb } from "../../core/db.js";
import { coerceToFiniteNumber } from "../../shared/type.utils.js";

export const initHealthRepository = (): void => {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL
    )
  `);
};

export const recordRun = (): void => {
  const INSERT = "INSERT INTO runs (started_at) VALUES (?)";
  getDb().prepare(INSERT).run(new Date().toISOString());
};

export const getRunsCount = (): number => {
  const SELECT = "SELECT COUNT(*) AS count FROM runs";
  const row = getDb().prepare(SELECT).get();

  // Some SQLite drivers may return numeric values as strings or other types.
  // Coerce to a finite number with a safe fallback.
  if (row && typeof row === "object" && "count" in row) {
    return coerceToFiniteNumber((row as Record<string, unknown>)["count"], 0);
  }
  return 0;
};
