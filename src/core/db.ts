import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DB_BUSY_TIMEOUT_MS, DB_PATH } from "../shared/config.js";
import { createLogger, type Logger } from "../shared/logger.js";

const databaseConnectionCache: { current?: DatabaseSync } = {};

/** Creates the parent folder if needed and opens the file, logging any failure. */
const openConnection = (logger: Logger): DatabaseSync => {
  logger.info(`File path: "${DB_PATH}"`);
  if (!existsSync(DB_PATH)) {
    logger.warn(`Database file not found. A new one will be created.`);
  }
  mkdirSync(dirname(DB_PATH), { recursive: true });
  try {
    return new DatabaseSync(DB_PATH);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`Connection failed: ${reason}`);
    throw error;
  }
};

/*
 * WAL lets readers and writers overlap; busy_timeout makes concurrent writers
 * (e.g. multiple node:test worker processes sharing the dev db file) wait
 * their turn instead of failing immediately with SQLITE_BUSY.
 */
const applyPragmas = (db: Readonly<DatabaseSync>): void => {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`PRAGMA busy_timeout = ${DB_BUSY_TIMEOUT_MS};`);
};

/**
 * Shared connection only: tables belong to each module's `init{Module}Repository()`,
 * never here.
 */
export const getDb = (): DatabaseSync => {
  const cached = databaseConnectionCache.current;
  if (cached) return cached;
  const logger = createLogger("db");
  const db = openConnection(logger);
  databaseConnectionCache.current = db;
  applyPragmas(db);
  logger.info(`Database opened.`);
  return db;
};
