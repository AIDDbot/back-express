import type { StatementResultingChanges } from "node:sqlite";
import { getDb } from "../../core/db.js";
import { ApiError } from "../../shared/errors.js";
import { isRecord } from "../../shared/guard.utils.js";

/** Internal row shape; includes the password hash, never exposed on the wire. */
export interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string;
}

const toUserRecord = (row: Readonly<UserRow>): UserRecord => ({
  createdAt: row.created_at,
  email: row.email,
  id: row.id,
  name: row.name,
  passwordHash: row.password_hash,
  role: row.role,
});

export const initAuthRepository = (): void => {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user')),
      created_at TEXT NOT NULL
    )
  `);
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  getDb().exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
  `);
};

export const findUserByEmail = (email: string): UserRecord | undefined => {
  const SELECT =
    "SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?";
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const row = getDb().prepare(SELECT).get(email) as UserRow | undefined;
  return row ? toUserRecord(row) : undefined;
};

export interface InsertUserParams {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

/** SQLite extended result code for a UNIQUE constraint violation. */
const SQLITE_CONSTRAINT_UNIQUE = 2067;

/**
 * True when `error` is the SQLite driver's report of a UNIQUE violation on
 * `users.email`. The DB constraint is the source of truth for duplicate
 * emails (T0005); any other error is left for the caller to rethrow as-is.
 */
const isUniqueEmailViolation = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  const { errcode, message } = error;
  return (
    errcode === SQLITE_CONSTRAINT_UNIQUE &&
    typeof message === "string" &&
    message.includes("users.email")
  );
};

export const insertUser = (params: Readonly<InsertUserParams>): UserRecord => {
  const createdAt = new Date().toISOString();
  const INSERT =
    "INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)";
  let result: StatementResultingChanges;
  try {
    result = getDb()
      .prepare(INSERT)
      .run(params.email, params.name, params.passwordHash, params.role, createdAt);
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      throw new ApiError(409, "Email already registered");
    }
    throw error;
  }
  return {
    createdAt,
    email: params.email,
    id: Number(result.lastInsertRowid),
    name: params.name,
    passwordHash: params.passwordHash,
    role: params.role,
  };
};

export interface InsertSessionParams {
  token: string;
  userId: number;
}

export const insertSession = (params: Readonly<InsertSessionParams>): void => {
  const createdAt = new Date().toISOString();
  const INSERT = "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)";
  getDb().prepare(INSERT).run(params.token, params.userId, createdAt);
};
