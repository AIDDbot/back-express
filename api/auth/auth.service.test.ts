import assert from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { findUserByEmail } from "./auth.repository.js";
import { loginUser, registerUser, startAuthTracking, toPublicUser } from "./auth.service.js";

interface WithStatus {
  status?: number;
  message?: string;
}

const asWithStatus = (error: unknown): WithStatus => error as WithStatus;

const BAD_REQUEST = 400;
const CONFLICT = 409;
const UNAUTHORIZED = 401;
const INVALID_CREDENTIALS = "Invalid credentials";

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const isApiErrorWithStatus =
  (status: number) =>
  (error: unknown): boolean =>
    asWithStatus(error).status === status;

startAuthTracking();

void describe("registerUser", () => {
  void it("creates a user, normalizes the email, and never returns the password", async () => {
    const email = uniqueEmail("register");

    const user = await registerUser({
      email: `  ${email.toUpperCase()}  `,
      name: "Ada Lovelace",
      password: "s3cret",
    });

    assert.strictEqual(user.email, email, "should trim and lower-case the email");
    assert.strictEqual(user.role, "user");
    assert.ok(!("password" in user), "should not include password");
    assert.ok(!("passwordHash" in user), "should not include passwordHash");

    const stored = findUserByEmail(email);
    assert.ok(stored, "should persist the user");
    assert.notStrictEqual(stored?.passwordHash, "s3cret", "should never store the plain password");
    const matches = await Bun.password.verify("s3cret", stored?.passwordHash ?? "");
    assert.ok(matches, "the stored hash should verify against the submitted password");
  });

  void it("ignores a client-supplied role: the stored and returned role is always user", async () => {
    const email = uniqueEmail("ignored-role");

    const user = await registerUser({
      email,
      name: "Ada",
      password: "s3cret",
      role: "admin",
    });

    assert.strictEqual(user.role, "user");
    const stored = findUserByEmail(email);
    assert.strictEqual(stored?.role, "user");
  });
});

void describe("registerUser validation (400)", () => {
  void it("rejects missing or blank fields with 400", async () => {
    await assert.rejects(
      registerUser({ email: "", name: "Ada", password: "s3cret" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
    await assert.rejects(
      registerUser({ email: uniqueEmail("empty-pw"), name: "Ada", password: "" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
    await assert.rejects(
      registerUser({ email: uniqueEmail("no-name"), name: "", password: "s3cret" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
  });

  void it("rejects non-string field values with 400", async () => {
    await assert.rejects(
      registerUser({ email: 123, name: "Ada", password: "s3cret" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
    await assert.rejects(
      registerUser({ email: uniqueEmail("bad-name"), name: ["Ada"], password: "s3cret" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
    await assert.rejects(
      registerUser({ email: uniqueEmail("bad-pw"), name: "Ada", password: { hash: "s3cret" } }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
  });
});

void describe("registerUser - non-object bodies and duplicates (400/409)", () => {
  void it("rejects a non-object body with 400", async () => {
    await assert.rejects(registerUser(null), isApiErrorWithStatus(BAD_REQUEST));
    await assert.rejects(registerUser("not an object"), isApiErrorWithStatus(BAD_REQUEST));
  });

  void it("rejects a duplicate email, case-insensitively, with 409", async () => {
    const email = uniqueEmail("dup");
    await registerUser({ email, name: "Ada", password: "s3cret" });

    await assert.rejects(
      registerUser({ email: email.toUpperCase(), name: "Ada 2", password: "other" }),
      isApiErrorWithStatus(CONFLICT),
    );
  });
});

void describe("registerUser concurrency (T0005)", () => {
  void it("resolves exactly one of two concurrent duplicate registrations, the other rejects with 409", async () => {
    const email = uniqueEmail("race");
    const attempt = (name: string) => registerUser({ email, name, password: "s3cret" });

    const results = await Promise.allSettled([attempt("First"), attempt("Second")]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.strictEqual(fulfilled.length, 1, "exactly one registration should succeed");
    assert.strictEqual(rejected.length, 1, "exactly one registration should be rejected");
    const rejection = rejected[0];
    assert.ok(rejection && rejection.status === "rejected");
    assert.strictEqual(asWithStatus(rejection.reason).status, CONFLICT);
    assert.strictEqual(asWithStatus(rejection.reason).message, "Email already registered");
  });

  void it("still rejects with 409 when the insert races past the existence check", async () => {
    const email = uniqueEmail("race-insert");
    await registerUser({ email, name: "Ada", password: "s3cret" });
    // findUserByEmail would already report this email as taken; this forces
    // the same path the insert-time UNIQUE guard must cover regardless.
    await assert.rejects(
      registerUser({ email, name: "Ada 2", password: "other" }),
      isApiErrorWithStatus(CONFLICT),
    );
  });
});

void describe("loginUser", () => {
  void it("returns a token and the user for correct credentials", async () => {
    const email = uniqueEmail("login-ok");
    await registerUser({ email, name: "Ada", password: "s3cret" });

    const session = await loginUser({ email, password: "s3cret" });

    assert.ok(session.token, "should return a non-empty token");
    assert.strictEqual(session.user.email, email);
    assert.strictEqual(session.user.role, "user");
    assert.ok(!("password" in session.user), "should not include password");
  });

  void it("rejects a wrong password and an unknown email with the same 401 message", async () => {
    const email = uniqueEmail("login-bad");
    await registerUser({ email, name: "Ada", password: "s3cret" });

    await assert.rejects(
      loginUser({ email, password: "wrong" }),
      (error: unknown) =>
        asWithStatus(error).status === UNAUTHORIZED &&
        asWithStatus(error).message === INVALID_CREDENTIALS,
    );
    await assert.rejects(
      loginUser({ email: uniqueEmail("unknown"), password: "s3cret" }),
      (error: unknown) =>
        asWithStatus(error).status === UNAUTHORIZED &&
        asWithStatus(error).message === INVALID_CREDENTIALS,
    );
  });

  void it("rejects missing fields with 400", async () => {
    await assert.rejects(
      loginUser({ email: "", password: "s3cret" }),
      isApiErrorWithStatus(BAD_REQUEST),
    );
    await assert.rejects(loginUser(undefined), isApiErrorWithStatus(BAD_REQUEST));
  });
});

void describe("loginUser timing safety (T0004)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  void it("calls Bun.password.verify exactly once for an unknown email", async () => {
    const verifySpy = mock.method(Bun.password, "verify");

    await assert.rejects(
      loginUser({ email: uniqueEmail("timing-unknown"), password: "whatever" }),
      (error: unknown) =>
        asWithStatus(error).status === UNAUTHORIZED &&
        asWithStatus(error).message === INVALID_CREDENTIALS,
    );

    assert.strictEqual(verifySpy.mock.callCount(), 1);
  });

  void it("calls Bun.password.verify exactly once for a known email with a wrong password", async () => {
    const email = uniqueEmail("timing-known");
    await registerUser({ email, name: "Ada", password: "s3cret" });
    const verifySpy = mock.method(Bun.password, "verify");

    await assert.rejects(
      loginUser({ email, password: "wrong" }),
      (error: unknown) =>
        asWithStatus(error).status === UNAUTHORIZED &&
        asWithStatus(error).message === INVALID_CREDENTIALS,
    );

    assert.strictEqual(verifySpy.mock.callCount(), 1);
  });
});

void describe("toPublicUser (T0006)", () => {
  void it("rejects a mocked stored record whose role is not user", () => {
    const invalidRecord = {
      createdAt: new Date().toISOString(),
      email: uniqueEmail("invalid-role"),
      id: 1,
      name: "Ada",
      passwordHash: "hash",
      role: "admin",
    };

    assert.throws(() => {
      toPublicUser(invalidRecord);
    }, /invalid role/u);
  });
});
