import { getDb } from "../../shared/db.js";

export const initHealthRepository = (): void => {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL
    )
  `);
};

export const recordRun = (): void => {
  const INSERT 
   = "INSERT INTO runs (started_at) VALUES (?)";
  getDb().prepare(INSERT).run(new Date().toISOString());
};

export const getRunsCount = (): number => {
  const SELECT = "SELECT COUNT(*) AS count FROM runs";
  const { count } = getDb().prepare(SELECT).get() as {
    count: number;
  };
  return count;
};
