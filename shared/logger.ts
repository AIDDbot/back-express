import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LOG_LEVELS, type LogLevel, logLevel as defaultLogLevel, logDir } from "./config.js";

export type { LogLevel } from "./config.js";

export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface LoggerOptions {
  dir?: string;
  level?: LogLevel;
}

/** Derived from the level names, so renaming one (e.g. "warning") keeps the column aligned. */
const LEVEL_WIDTH = Math.max(...LOG_LEVELS.map((name) => name.length));
/** Longer sources are truncated so the message column never moves. */
const SOURCE_MAX_LENGTH = 10;
const BRACKETS_LENGTH = 2;
const SOURCE_WIDTH = SOURCE_MAX_LENGTH + BRACKETS_LENGTH;
const MONTH_OFFSET = 1;

const pad = (value: number, width = 2): string => String(value).padStart(width, "0");

/** Local date as yyyy-mm-dd; used as the daily file name. */
export const formatLogDate = (date: Readonly<Date>): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + MONTH_OFFSET)}-${pad(date.getDate())}`;

const formatLogTime = (date: Readonly<Date>): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;

/**
 * One event per line with space-padded columns (time, level, source); the message goes last,
 * trimmed and with embedded line breaks escaped.
 */
export const formatLogLine = (
  date: Readonly<Date>,
  level: LogLevel,
  source: string,
  message: string,
): string => {
  const levelColumn = level.toUpperCase().padEnd(LEVEL_WIDTH);
  const sourceColumn = `[${source.trim().slice(0, SOURCE_MAX_LENGTH)}]`.padEnd(SOURCE_WIDTH);
  const singleLine = message.trim().replaceAll(/\r?\n/gu, String.raw`\n`);
  return `${formatLogTime(date)} ${levelColumn} ${sourceColumn} ${singleLine}`;
};

const isEnabled = (level: LogLevel, minLevel: LogLevel): boolean =>
  LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(minLevel);

const fileFailure = { reported: false };

/** Never throws: a failing file write is reported once and logging continues on the console. */
const appendToFile = (dir: string, date: Readonly<Date>, line: string): void => {
  try {
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, `${formatLogDate(date)}.log`), `${line}\n`);
  } catch (error) {
    if (fileFailure.reported) return;
    fileFailure.reported = true;
    const reason = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Logger could not write to ${dir}: ${reason}\n`);
  }
};

const writeToConsole = (level: LogLevel, line: string): void => {
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
};

export const createLogger = (source: string, options: Readonly<LoggerOptions> = {}): Logger => {
  const dir = options.dir ?? logDir;
  const minLevel = options.level ?? defaultLogLevel;
  const log = (level: LogLevel, message: string): void => {
    if (!isEnabled(level, minLevel)) return;
    const now = new Date();
    const line = formatLogLine(now, level, source, message);
    appendToFile(dir, now, line);
    writeToConsole(level, line);
  };
  return {
    debug: (message) => {
      log("debug", message);
    },
    error: (message) => {
      log("error", message);
    },
    info: (message) => {
      log("info", message);
    },
    warn: (message) => {
      log("warn", message);
    },
  };
};
