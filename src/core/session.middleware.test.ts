import type { Request, Response } from "express";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createSessionMiddleware } from "./session.middleware.js";

interface MiddlewareOutcome {
  error?: unknown;
  nextCalled: boolean;
  res: Response;
}

const runMiddleware = (
  authorization: string | undefined,
  resolveSession: (token: string) => unknown = (token) => ({ token }),
): MiddlewareOutcome => {
  const req = {
    get: (name: string): string | undefined =>
      name.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const outcome: MiddlewareOutcome = { nextCalled: false, res };
  createSessionMiddleware(resolveSession)(req, res, (error?: unknown) => {
    outcome.nextCalled = true;
    outcome.error = error;
  });
  return outcome;
};

void describe("createSessionMiddleware", () => {
  void it("rejects a missing or malformed bearer header", () => {
    for (const header of [undefined, "Basic abc", "Bearer"]) {
      const outcome = runMiddleware(header);

      assert.ok(outcome.nextCalled);
      assert.equal((outcome.error as { status?: number }).status, 401);
      assert.equal(outcome.res.locals["sessionUser"], undefined);
    }
  });

  void it("resolves a bearer token and stores its principal", () => {
    const principal = { id: 7 };
    const outcome = runMiddleware("Bearer token-123", (token) => {
      assert.equal(token, "token-123");
      return principal;
    });

    assert.ok(outcome.nextCalled);
    assert.equal(outcome.error, undefined);
    assert.strictEqual(outcome.res.locals["sessionUser"], principal);
  });

  void it("forwards session lookup failures to Express", () => {
    const failure = new Error("Invalid session");
    const outcome = runMiddleware("Bearer invalid", () => {
      throw failure;
    });

    assert.ok(outcome.nextCalled);
    assert.strictEqual(outcome.error, failure);
  });
});
