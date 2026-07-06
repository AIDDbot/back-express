import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dbPath } from "./config.js";

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

// WAL lets readers and writers overlap; busy_timeout makes concurrent writers
// (e.g. multiple node:test worker processes sharing the dev db file) wait
// their turn instead of failing immediately with SQLITE_BUSY.
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");
