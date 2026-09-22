import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createLogger, formatLogDate, formatLogLine } from "./logger.js";

const SAMPLE_DATE = new Date(2026, 8, 2, 7, 5, 3, 9);

void describe("logger formatting", () => {
  void it("formats the daily file name as a local yyyy-mm-dd date", () => {
    assert.equal(formatLogDate(SAMPLE_DATE), "2026-09-02");
  });

  void it("formats a line with time, padded level, source and message", () => {
    assert.equal(
      formatLogLine(SAMPLE_DATE, "info", "http", "hello"),
      "07:05:03.009 INFO  [http] hello",
    );
    assert.equal(formatLogLine(SAMPLE_DATE, "error", "db", "down"), "07:05:03.009 ERROR [db] down");
  });

  void it("escapes line breaks so each event stays on one line", () => {
    const line = formatLogLine(SAMPLE_DATE, "warn", "x", "a\nb\r\nc");

    assert.equal(line, String.raw`07:05:03.009 WARN  [x] a\nb\nc`);
  });
});

const captured: { dir: string; stdout: string[]; stderr: string[] } = {
  dir: "",
  stderr: [],
  stdout: [],
};

const readTodayLog = (): string[] => {
  const file = join(captured.dir, `${formatLogDate(new Date())}.log`);
  return readFileSync(file, "utf8").trimEnd().split("\n");
};

const setUpOutput = (): void => {
  captured.dir = mkdtempSync(join(tmpdir(), "logger-test-"));
  captured.stdout = [];
  captured.stderr = [];
  mock.method(process.stdout, "write", (chunk: string) => {
    captured.stdout.push(chunk);
    return true;
  });
  mock.method(process.stderr, "write", (chunk: string) => {
    captured.stderr.push(chunk);
    return true;
  });
};

const tearDownOutput = (): void => {
  mock.restoreAll();
  rmSync(captured.dir, { force: true, recursive: true });
};

void describe("logger file output", () => {
  beforeEach(setUpOutput);
  afterEach(tearDownOutput);

  void it("appends lines to today's file without overwriting", () => {
    const log = createLogger("test", { dir: captured.dir, level: "debug" });

    log.info("first");
    log.debug("second");

    const lines = readTodayLog();
    assert.equal(lines.length, 2);
    assert.match(lines[0] ?? "", /^\d{2}:\d{2}:\d{2}\.\d{3} INFO {2}\[test\] first$/u);
    assert.match(lines[1] ?? "", / DEBUG \[test\] second$/u);
  });

  void it("skips levels below the configured minimum", () => {
    const log = createLogger("test", { dir: captured.dir, level: "warn" });

    log.debug("hidden");
    log.info("hidden");
    log.warn("shown");
    log.error("shown");

    assert.deepEqual(
      readTodayLog().map((line) => line.slice(13, 18)),
      ["WARN ", "ERROR"],
    );
  });
});

void describe("logger console output", () => {
  beforeEach(setUpOutput);
  afterEach(tearDownOutput);

  void it("echoes info to stdout and warn/error to stderr", () => {
    const log = createLogger("test", { dir: captured.dir, level: "debug" });

    log.info("to stdout");
    log.error("to stderr");

    assert.ok(captured.stdout.some((line) => line.includes("to stdout")));
    assert.ok(captured.stderr.some((line) => line.includes("to stderr")));
    assert.ok(!captured.stdout.some((line) => line.includes("to stderr")));
  });

  void it("keeps logging to the console when the file cannot be written", () => {
    const blocker = join(captured.dir, "not-a-dir");
    writeFileSync(blocker, "");
    const log = createLogger("test", { dir: blocker });

    assert.doesNotThrow(() => {
      log.info("still here");
    });
    assert.ok(captured.stdout.some((line) => line.includes("still here")));
    assert.ok(!existsSync(join(blocker, `${formatLogDate(new Date())}.log`)));
  });
});
