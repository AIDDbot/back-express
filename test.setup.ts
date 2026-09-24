import { tmpdir } from "node:os";
import { join } from "node:path";

/* Keep test runs from writing into the project's ./logs folder. */
process.env["LOG_DIR"] ??= join(tmpdir(), "back-express-test-logs");

/*
 * Keep test runs from writing into the project's ./data/demo.db.
 * Unique per process so parallel or repeated `bun test` runs never share
 * users through the same file.
 */
process.env["DB_PATH"] ??= join(
  tmpdir(),
  `back-express-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
