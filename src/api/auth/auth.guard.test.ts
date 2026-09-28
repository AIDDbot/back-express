import express, { type Request, type Response } from "express";
import { strict as assert } from "node:assert";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { errorHandler } from "../../shared/errors.js";
import { apiRouter } from "../api.js";
import { getSessionUser, requireSession } from "./auth.guard.js";
import { loginUser, registerUser, startAuthTracking } from "./auth.service.js";
import type { User } from "./auth.types.js";

const UNAUTHORIZED = 401;
const OK = 200;
const CREATED = 201;

interface GuardOutcome {
  error?: unknown;
  nextCalled: boolean;
  res: Response;
}

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const runGuard = (authorization?: string): GuardOutcome => {
  const req = {
    get: (name: string): string | undefined =>
      name.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const outcome: GuardOutcome = { nextCalled: false, res };
  requireSession(req, res, (error?: unknown) => {
    outcome.nextCalled = true;
    outcome.error = error;
  });
  return outcome;
};

const assertUnauthorized = (outcome: Readonly<GuardOutcome>): void => {
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

void describe("requireSession", () => {
  void it("rejects a request without an Authorization header", () => {
    assertUnauthorized(runGuard());
  });

  void it("rejects a non-Bearer scheme", () => {
    assertUnauthorized(runGuard("Basic dXNlcjpwYXNz"));
    assertUnauthorized(runGuard("Bearer"));
  });

  void it("rejects an unknown token", () => {
    assertUnauthorized(runGuard(`Bearer ${crypto.randomUUID()}`));
  });

  void it("accepts a valid token and exposes the public user", async () => {
    const session = await createSession("guard-ok");

    const outcome = runGuard(`Bearer ${session.token}`);

    assert.ok(outcome.nextCalled);
    assert.equal(outcome.error, undefined);
    assert.deepEqual(getSessionUser(outcome.res), session.user);
    assert.ok(!("passwordHash" in getSessionUser(outcome.res)));
  });
});

void describe("getSessionUser", () => {
  void it("throws when the route is not protected by requireSession", () => {
    const res = { locals: {} } as unknown as Response;

    assert.throws(() => getSessionUser(res), /requireSession/u);
  });
});

const http: { baseUrl: string; server?: Server } = { baseUrl: "" };

const post = (path: string, body: unknown): Promise<globalThis.Response> =>
  fetch(`${http.baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

const startApi = async (): Promise<void> => {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(errorHandler);
  const server = app.listen(0);
  http.server = server;
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });
  http.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`;
};

const stopApi = (): Promise<void> =>
  new Promise<void>((resolve) => {
    http.server?.close(() => {
      resolve();
    });
  });

void describe("auth routes over HTTP", () => {
  before(startApi);
  after(stopApi);

  void it("GET /me returns 401 { error } without a session", async () => {
    const response = await fetch(`${http.baseUrl}/me`);

    assert.equal(response.status, UNAUTHORIZED);
    const body = (await response.json()) as { error?: unknown };
    assert.equal(typeof body.error, "string");
  });

  void it("register, login, then GET /me returns the current public user", async () => {
    const credentials = { email: uniqueEmail("me"), password: "s3cret" };
    const registered = await post("/register", { ...credentials, name: "Ada" });
    assert.equal(registered.status, CREATED);
    const login = await post("/login", credentials);
    assert.equal(login.status, OK);
    const session = (await login.json()) as { token: string; user: User };

    const response = await fetch(`${http.baseUrl}/me`, {
      headers: { authorization: `Bearer ${session.token}` },
    });

    assert.equal(response.status, OK);
    assert.deepEqual(await response.json(), session.user);
  });
});
