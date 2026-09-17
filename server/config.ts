const DEFAULT_PORT = 3000;

export const dbPath = process.env["DB_PATH"] ?? "./data/demo.db";

import { clamp, safeParseInt } from "../shared/type.utils.js";

const envPort = process.env["PORT"];
let resolvedPort = DEFAULT_PORT;
if (envPort) {
  const parsed = safeParseInt(envPort, DEFAULT_PORT);
  resolvedPort = clamp(parsed, 0, 65535);
}

export const port = resolvedPort;
