import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DB_BUSY_TIMEOUT_MS, DB_PATH } from "../shared/config.js";
import { createLogger } from "../shared/logger.js";

const databaseConnectionCache: { current?: DatabaseSync } = {};

export const getDb = (): DatabaseSync => {
  let db = databaseConnectionCache.current;
  if (db) return db;
  const logger = createLogger("db");
  logger.info(`File path: "${DB_PATH}"`);
  if (!existsSync(DB_PATH)) {
    logger.warn(`Database file not found. A new one will be created.`);
  }
  mkdirSync(dirname(DB_PATH), { recursive: true });
  try {
    db = new DatabaseSync(DB_PATH);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`Connection failed: ${reason}`);
    throw error;
  }
  databaseConnectionCache.current = db;
  /*
   * WAL lets readers and writers overlap; busy_timeout makes concurrent writers
   * (e.g. multiple node:test worker processes sharing the dev db file) wait
   * their turn instead of failing immediately with SQLITE_BUSY.
   */
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`PRAGMA busy_timeout = ${DB_BUSY_TIMEOUT_MS};`);
  logger.info(`Database opened.`);
  return db;
};
