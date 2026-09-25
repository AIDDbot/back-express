import express from "express";
import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import type { Logger } from "../shared/logger.js";
import { requestLogger } from "./request-logger.js";

interface Entry {
  level: string;
  message: string;
}

const createRecordingLogger = (entries: Entry[]): Logger => ({
  debug: (message) => {
    entries.push({ level: "debug", message });
  },
  error: (message) => {
    entries.push({ level: "error", message });
  },
  info: (message) => {
    entries.push({ level: "info", message });
  },
  warn: (message) => {
    entries.push({ level: "warn", message });
  },
});

const requestStatus = async (path: string): Promise<Entry[]> => {
  const entries: Entry[] = [];
  const app = express();
  app.use(requestLogger(createRecordingLogger(entries)));
  app.get("/ok", (_req, res) => res.sendStatus(200));
  app.get("/fail", (_req, res) => res.sendStatus(500));
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve) => {
      server.once("listening", resolve);
    });
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    await response.text();
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  }
  return entries;
};

void describe("request logger", () => {
  void it("logs method, url, status and duration as info", async () => {
    const entries = await requestStatus("/ok?x=1");

    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.level, "info");
    assert.match(entries[0]?.message ?? "", /^200 GET {2}"\/ok\?x=1" \d+ ms$/u);
  });

  void it("logs client errors as warn", async () => {
    const entries = await requestStatus("/missing");

    assert.equal(entries[0]?.level, "warn");
    assert.match(entries[0]?.message ?? "", /^404 GET {2}"\/missing" /u);
  });

  void it("logs server errors as error", async () => {
    const entries = await requestStatus("/fail");

    assert.equal(entries[0]?.level, "error");
  });
});
