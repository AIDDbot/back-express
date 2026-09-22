import { tmpdir } from "node:os";
import { join } from "node:path";

/* Keep test runs from writing into the project's ./logs folder. */
process.env["LOG_DIR"] ??= join(tmpdir(), "back-express-test-logs");
