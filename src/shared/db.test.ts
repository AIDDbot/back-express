import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DB_BUSY_TIMEOUT_MS } from "./config.ts";
import { getDb } from "./db.ts";

void describe("getDb", () => {
  void it("returns one shared connection and applies SQLite pragmas", () => {
    const db = getDb();

    assert.strictEqual(getDb(), db);
    assert.equal(db.prepare("SELECT 1 AS value").get()?.["value"], 1);
    assert.equal(db.prepare("PRAGMA journal_mode").get()?.["journal_mode"], "wal");
    assert.equal(db.prepare("PRAGMA busy_timeout").get()?.["timeout"], DB_BUSY_TIMEOUT_MS);
  });
});
