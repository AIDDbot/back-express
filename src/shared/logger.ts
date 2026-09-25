import { appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { LOG_DIR, LOG_LEVEL, LOG_LEVELS, type LogLevel } from "./config.js";

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
const MONTH_OFFSET = 1;

const pad = (value: number, width = 2): string => String(value).padStart(width, "0");

/** Local date as yyyy-mm-dd; used as the daily file name. */
export const formatLogDate = (date: Readonly<Date>): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + MONTH_OFFSET)}-${pad(date.getDate())}`;

const formatLogTime = (date: Readonly<Date>): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;

/**
 * One event per line with space-padded columns (time, source, level); the message goes last,
 * trimmed and with embedded line breaks escaped.
 */
export const formatLogLine = (
  date: Readonly<Date>,
  level: LogLevel,
  source: string,
  message: string,
): string => {
  const levelColumn = level.toUpperCase().padEnd(LEVEL_WIDTH);
  const sourceColumn = `${source.trim().slice(0, SOURCE_MAX_LENGTH).padEnd(SOURCE_MAX_LENGTH)}`;
  const singleLine = message.trim().replaceAll(/\r?\n/gu, String.raw`\n`);
  return `${formatLogTime(date)} ${sourceColumn} ${levelColumn} ${singleLine}`;
};

const isEnabled = (level: LogLevel, minLevel: LogLevel): boolean =>
  LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(minLevel);

const fileFailure = { reported: false };
const readyDirectories = new Set<string>();

/** Never throws: a failing file write is reported once and logging continues on the console. */
const appendToFile = (dir: string, filePath: string, line: string): void => {
  try {
    if (!readyDirectories.has(dir)) {
      mkdirSync(dir, { recursive: true });
      readyDirectories.add(dir);
    }
    appendFileSync(filePath, `${line}\n`);
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
  const dir = resolve(options.dir ?? LOG_DIR);
  const minLevel = options.level ?? LOG_LEVEL;
  let fileDate = "";
  let filePath = "";
  const log = (level: LogLevel, message: string): void => {
    if (!isEnabled(level, minLevel)) return;
    const now = new Date();
    const currentFileDate = formatLogDate(now);
    if (currentFileDate !== fileDate) {
      fileDate = currentFileDate;
      filePath = join(dir, `${fileDate}.log`);
    }
    const line = formatLogLine(now, level, source, message);
    appendToFile(dir, filePath, line);
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
