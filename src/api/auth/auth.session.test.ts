import type { Request, Response } from "express";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createSessionMiddleware } from "../../core/session.middleware.js";
import { getSessionUser } from "./auth.session.js";
import { findSessionUser, loginUser, registerUser, startAuthTracking } from "./auth.service.js";
import type { User } from "./auth.types.js";

const UNAUTHORIZED = 401;
const requireSession = createSessionMiddleware(findSessionUser);

interface MiddlewareOutcome {
  error?: unknown;
  nextCalled: boolean;
  res: Response;
}

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const runSessionMiddleware = (authorization?: string): MiddlewareOutcome => {
  const req = {
    get: (name: string): string | undefined =>
      name.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const outcome: MiddlewareOutcome = { nextCalled: false, res };
  requireSession(req, res, (error?: unknown) => {
    outcome.nextCalled = true;
    outcome.error = error;
  });
  return outcome;
};

const assertUnauthorized = (outcome: Readonly<MiddlewareOutcome>): void => {
  assert.ok(outcome.nextCalled, "should hand control to next");
  assert.equal((outcome.error as { status?: number }).status, UNAUTHORIZED);
  assert.equal(outcome.res.locals.sessionUser, undefined);
};

const createSession = async (label: string): Promise<{ token: string; user: User }> => {
  const email = uniqueEmail(label);
  await registerUser({ email, name: "Ada", password: "s3cret" });
  return loginUser({ email, password: "s3cret" });
};

startAuthTracking();

void describe("session middleware", () => {
  void it("rejects a request without an Authorization header", () => {
    assertUnauthorized(runSessionMiddleware());
  });

  void it("rejects a non-Bearer scheme", () => {
    assertUnauthorized(runSessionMiddleware("Basic dXNlcjpwYXNz"));
    assertUnauthorized(runSessionMiddleware("Bearer"));
  });

  void it("rejects an unknown token", () => {
    assertUnauthorized(runSessionMiddleware(`Bearer ${crypto.randomUUID()}`));
  });

  void it("accepts a valid token and exposes the public user", async () => {
    const session = await createSession("session-ok");

    const outcome = runSessionMiddleware(`Bearer ${session.token}`);

    assert.ok(outcome.nextCalled);
    assert.equal(outcome.error, undefined);
    assert.deepEqual(getSessionUser(outcome.res), session.user);
    assert.ok(!("passwordHash" in getSessionUser(outcome.res)));
  });
});

void describe("getSessionUser", () => {
  void it("throws when the route is not protected by session middleware", () => {
    const res = { locals: {} } as unknown as Response;

    assert.throws(() => getSessionUser(res), /session middleware/u);
  });
});
