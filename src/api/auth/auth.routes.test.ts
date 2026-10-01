import express from "express";
import { strict as assert } from "node:assert";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { errorHandler } from "../../core/error-handler.ts";
import { createSessionMiddleware } from "../../core/session.middleware.ts";
import { createApiRouter } from "../api.ts";
import { findSessionUser, startAuthTracking } from "./auth.service.ts";
import type { User } from "./auth.types.ts";

const UNAUTHORIZED = 401;
const OK = 200;
const CREATED = 201;
const requireSession = createSessionMiddleware(findSessionUser);
const http: { baseUrl: string; server?: Server } = { baseUrl: "" };

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const post = (path: string, body: unknown): Promise<globalThis.Response> =>
  fetch(`${http.baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

const startApi = async (): Promise<void> => {
  startAuthTracking();
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(requireSession));
  app.use(errorHandler());
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
