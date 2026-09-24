import assert from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { loginUser, registerUser, startAuthTracking } from "./auth.service.js";

interface WithStatus {
  status?: number;
}

const CONFLICT = 409;
const UNAUTHORIZED = 401;

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const isApiErrorWithStatus =
  (status: number) =>
  (error: unknown): boolean =>
    (error as WithStatus).status === status;

/** Spies on the console streams createLogger writes to, and returns the captured lines. */
const captureLogs = (): (() => string[]) => {
  const lines: string[] = [];
  const record = (chunk: string | Uint8Array): boolean => {
    lines.push(chunk.toString().trim());
    return true;
  };
  mock.method(process.stdout, "write", record);
  mock.method(process.stderr, "write", record);
  return () => lines;
};

startAuthTracking();

void describe("auth logging — success paths (T0007)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  void it("logs a successful registration by id only", async () => {
    const getLogs = captureLogs();
    const email = uniqueEmail("log-register");
    const password = "s3cret-log-check";

    const user = await registerUser({ email, name: "Ada", password });

    const logs = getLogs();
    assert.ok(logs.some((line) => line.endsWith(`User registered: ${user.id}`)));
    assert.ok(!logs.some((line) => line.includes(email) || line.includes(password)));
  });

  void it("logs a successful login by id only", async () => {
    const email = uniqueEmail("log-login");
    const password = "s3cret-log-check";
    await registerUser({ email, name: "Ada", password });

    const getLogs = captureLogs();
    const session = await loginUser({ email, password });

    const logs = getLogs();
    assert.ok(logs.some((line) => line.endsWith(`User logged in: ${session.user.id}`)));
    assert.ok(!logs.some((line) => line.includes(email) || line.includes(password)));
  });
});

void describe("auth logging — failure paths (T0007)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  void it("logs a duplicate registration with no email hint", async () => {
    const email = uniqueEmail("log-dup");
    await registerUser({ email, name: "Ada", password: "s3cret" });

    const getLogs = captureLogs();
    await assert.rejects(
      registerUser({ email, name: "Ada 2", password: "other" }),
      isApiErrorWithStatus(CONFLICT),
    );

    const logs = getLogs();
    assert.ok(
      logs.some((line) => line.endsWith("Registration rejected: email already registered")),
    );
    assert.ok(!logs.some((line) => line.includes(email)));
  });

  void it("logs a failed login for an unknown email with no email hint", async () => {
    const email = uniqueEmail("log-unknown");
    const getLogs = captureLogs();

    await assert.rejects(
      loginUser({ email, password: "whatever" }),
      isApiErrorWithStatus(UNAUTHORIZED),
    );

    const logs = getLogs();
    assert.ok(logs.some((line) => line.endsWith("Login failed: invalid credentials")));
    assert.ok(!logs.some((line) => line.includes(email)));
  });
});
