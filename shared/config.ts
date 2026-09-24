import { clamp, safeParseInt } from "./type.utils.js";

const DEFAULT_PORT = 3000;

export const dbPath = process.env["DB_PATH"] ?? "./data/demo.db";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const isLogLevel = (value: unknown): value is LogLevel =>
  LOG_LEVELS.some((level) => level === value);

const envPort = process.env["PORT"];
let resolvedPort = DEFAULT_PORT;
if (envPort) {
  const parsed = safeParseInt(envPort, DEFAULT_PORT);
  resolvedPort = clamp(parsed, 0, 65535);
}

export const port = resolvedPort;

const envLogLevel = process.env["LOG_LEVEL"]?.trim().toLowerCase();

export const logDir = process.env["LOG_DIR"] ?? "./logs";
export const logLevel: LogLevel = isLogLevel(envLogLevel) ? envLogLevel : "info";
