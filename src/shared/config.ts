import { isAbsolute, resolve } from "node:path";
import { clamp, safeParseInt } from "./type.utils.js";

/** `src/shared` → repository root, so relative paths ignore the process cwd. */
const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

const resolveSettingPath = (value: string): string =>
  isAbsolute(value) ? value : resolve(PROJECT_ROOT, value);

const DEFAULT_PORT = 3000;
const MIN_PORT = 0;
const MAX_PORT = 65535;
const DEFAULT_DB_BUSY_TIMEOUT_MS = 5000;
const MAX_DB_BUSY_TIMEOUT_MS = 60_000;
const DEFAULT_CORS_ORIGIN = "*";
const DEFAULT_LOG_LEVEL = "info";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const isLogLevel = (value: unknown): value is LogLevel =>
  LOG_LEVELS.some((level) => level === value);

const readClampedInt = (
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => clamp(safeParseInt(raw, fallback), min, max);

const parseCorsOrigin = (raw: string | undefined): string | readonly string[] => {
  const value = raw?.trim();
  if (!value) return DEFAULT_CORS_ORIGIN;
  const origins = Object.freeze(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
  if (origins.length === 0) return DEFAULT_CORS_ORIGIN;
  if (origins.length === 1) return origins[0] ?? DEFAULT_CORS_ORIGIN;
  return origins;
};

const envLogLevel = process.env["LOG_LEVEL"]?.trim().toLowerCase();

const SETTINGS = Object.freeze({
  /** HTTP path where the API router is mounted. */
  API_BASE_PATH: "/api" as const,
  CORS_ORIGIN: parseCorsOrigin(process.env["CORS_ORIGIN"]),
  DB_BUSY_TIMEOUT_MS: readClampedInt(
    process.env["DB_BUSY_TIMEOUT_MS"],
    DEFAULT_DB_BUSY_TIMEOUT_MS,
    0,
    MAX_DB_BUSY_TIMEOUT_MS,
  ),
  DB_PATH: resolveSettingPath(process.env["DB_PATH"] ?? "./data/demo.db"),
  /** Bind address. Unset keeps Node's default, which listens on all interfaces. */
  HOST: process.env["HOST"]?.trim() || undefined,
  LOG_DIR: resolveSettingPath(process.env["LOG_DIR"] ?? "./logs"),
  LOG_LEVEL: isLogLevel(envLogLevel) ? envLogLevel : DEFAULT_LOG_LEVEL,
  PORT: readClampedInt(process.env["PORT"], DEFAULT_PORT, MIN_PORT, MAX_PORT),
} as const);

export const {
  API_BASE_PATH,
  CORS_ORIGIN,
  DB_BUSY_TIMEOUT_MS,
  DB_PATH,
  HOST,
  LOG_DIR,
  LOG_LEVEL,
  PORT,
} = SETTINGS;
