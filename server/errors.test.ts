import { strict as assert } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import type { AddressInfo } from "node:net";
import express, { type Response } from "express";
import { ApiError, errorHandler } from "./errors.js";

interface ErrorResponse {
  body?: unknown;
  status?: number;
}

const handle = (error: unknown): ErrorResponse => {
  const response: ErrorResponse = {};
  const res = {
    json: (body: unknown): void => {
      response.body = body;
    },
    status: (status: number): Response => {
      response.status = status;
      return res as unknown as Response;
    },
  };

  errorHandler(error as never, {} as never, res as unknown as Response, (() => {}) as never);
  return response;
};

void describe("error handler", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  void it("preserves an ApiError status and message", () => {
    const response = handle(new ApiError(401, "Authentication required"));

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "Authentication required" });
  });

  void it("reports and logs an unexpected Error as a server error", () => {
    const writes: string[] = [];
    mock.method(process.stderr, "write", (chunk: string | Uint8Array) => {
      writes.push(chunk.toString());
      return true;
    });

    const response = handle(new Error("boom"));

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Internal server error" });
    assert.ok(writes.some((line) => line.includes("boom")));
  });

  void it("exposes an opted-in client-error message", () => {
    const response = handle({ statusCode: 400, expose: true, message: "Malformed JSON" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Malformed JSON" });
  });

  void it("hides a non-exposed client-error message", () => {
    const response = handle({ statusCode: 400, expose: false, message: "secret detail" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Bad request" });
    assert.ok(!JSON.stringify(response.body).includes("secret detail"));
  });

  void it("reports a non-object throw as a server error", () => {
    mock.method(process.stderr, "write", () => true);

    const response = handle("boom");

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Internal server error" });
  });
});

void describe("error handler integration", () => {
  void it("preserves express.json malformed-JSON errors as exposed 400 responses", async () => {
    const app = express();
    app.use(express.json());
    app.post("/", (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    const server = app.listen(0);

    try {
      await new Promise<void>((resolve) => {
        server.once("listening", resolve);
      });
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}`, {
        body: "{not valid json",
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      assert.equal(response.status, 400);
      const body = (await response.json()) as { error?: unknown };
      assert.equal(typeof body.error, "string");
      assert.notEqual(body.error, "Bad request");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});
