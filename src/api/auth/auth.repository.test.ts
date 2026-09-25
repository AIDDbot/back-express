import assert from "node:assert";
import { describe, it } from "node:test";
import {
  findUserByEmail,
  initAuthRepository,
  insertSession,
  insertUser,
} from "./auth.repository.js";

const MIN_ID = 0;
const CONFLICT = 409;

const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

void describe("auth repository", () => {
  initAuthRepository();

  void it("insertUser stores a user and findUserByEmail retrieves it", () => {
    const email = uniqueEmail("insert");

    const record = insertUser({
      email,
      name: "Ada",
      passwordHash: "hashed-value",
      role: "user",
    });

    assert.strictEqual(record.email, email);
    assert.ok(record.id > MIN_ID, "should assign a positive id");
    assert.ok(record.createdAt, "should stamp createdAt");

    const found = findUserByEmail(email);
    assert.ok(found, "should find the inserted user");
    assert.strictEqual(found?.passwordHash, "hashed-value");
    assert.strictEqual(found?.role, "user");
  });

  void it("findUserByEmail returns undefined for an unknown email", () => {
    const found = findUserByEmail(uniqueEmail("missing"));

    assert.strictEqual(found, undefined);
  });

  void it("insertSession records a session for a user without throwing", () => {
    const email = uniqueEmail("session");
    const user = insertUser({ email, name: "Ada", passwordHash: "hash", role: "user" });

    assert.doesNotThrow(() => {
      insertSession({ token: crypto.randomUUID(), userId: user.id });
    });
  });
});

void describe("auth repository - duplicate email conflict (T0005)", () => {
  void it("insertUser rejects a duplicate email with ApiError 409, not a raw DB error", () => {
    const email = uniqueEmail("duplicate");
    insertUser({ email, name: "Ada", passwordHash: "hash-1", role: "user" });

    assert.throws(
      () => {
        insertUser({ email, name: "Ada 2", passwordHash: "hash-2", role: "user" });
      },
      (error: unknown) =>
        error instanceof Error &&
        "status" in error &&
        (error as { status: unknown }).status === CONFLICT &&
        error.message === "Email already registered",
    );
  });

  void it("insertUser lets a non-unique DB error surface unchanged", () => {
    assert.throws(
      () => {
        // A CHECK constraint violation (invalid role), not a UNIQUE violation:
        // must not be mistaken for a duplicate-email conflict.
        insertUser({
          email: uniqueEmail("bad-role"),
          name: "Ada",
          passwordHash: "hash",
          role: "admin",
        });
      },
      (error: unknown) => error instanceof Error && !("status" in error),
    );
  });
});
