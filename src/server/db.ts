import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DB_BUSY_TIMEOUT_MS, DB_PATH } from "../shared/config.js";
import { createLogger } from "../shared/logger.js";

const databaseConnectionCache: { current?: DatabaseSync } = {};

export const getDb = (): DatabaseSync => {
  let db = databaseConnectionCache.current;
  if (db) return db;
  const logger = createLogger("db");
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  databaseConnectionCache.current = db;
  /*
   * WAL lets readers and writers overlap; busy_timeout makes concurrent writers
   * (e.g. multiple node:test worker processes sharing the dev db file) wait
   * their turn instead of failing immediately with SQLITE_BUSY.
   */
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`PRAGMA busy_timeout = ${DB_BUSY_TIMEOUT_MS};`);
  logger.info(`Database connection opened at "${DB_PATH}"`);
  return db;
};
