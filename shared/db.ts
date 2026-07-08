import { DatabaseSync } from "node:sqlite";
import { dbPath } from "./config.js";
import { mkdirSync } from "node:fs";
import path from "node:path";

// oxlint-disable-next-line eslint/init-declarations -- lazy singleton, assigned on first getDb() call.
let db: DatabaseSync | undefined;

export const getDb = (): DatabaseSync => {
  if (!db) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    /*
     * WAL lets readers and writers overlap; busy_timeout makes concurrent writers
     * (e.g. multiple node:test worker processes sharing the dev db file) wait
     * their turn instead of failing immediately with SQLITE_BUSY.
     */
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
  }
  return db;
};
