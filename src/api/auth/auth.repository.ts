import type { StatementResultingChanges } from "node:sqlite";
import { getDb } from "../../shared/db.js";
import { isRecord } from "../../shared/type.utils.js";

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

const USER_TEXT_COLUMNS = ["email", "name", "password_hash", "role", "created_at"] as const;

/** Narrows a raw SQLite row to `UserRow` at runtime instead of asserting its type. */
const isUserRow = (row: unknown): row is UserRow =>
  isRecord(row) &&
  typeof row["id"] === "number" &&
  USER_TEXT_COLUMNS.every((column) => typeof row[column] === "string");

/** Runs a single-row users query; a row that does not match `UserRow` is a server error. */
const selectUser = (sql: string, param: string): UserRecord | undefined => {
  const row = getDb().prepare(sql).get(param);
  if (row === undefined) return undefined;
  if (!isUserRow(row)) throw new Error("Unexpected users row shape");
  return toUserRecord(row);
};

export const findUserByEmail = (email: string): UserRecord | undefined =>
  selectUser(
    "SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?",
    email,
  );

/** The user owning the session `token`, or undefined when no such session exists. */
export const findUserBySessionToken = (token: string): UserRecord | undefined =>
  selectUser(
    `SELECT u.id, u.email, u.name, u.password_hash, u.role, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    token,
  );

export interface InsertUserParams {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}

/**
 * Domain error: the email is already taken. The repository knows nothing of HTTP;
 * the service decides how this reaches the client.
 */
export class DuplicateEmailError extends Error {
  public constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = "DuplicateEmailError";
  }
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
      throw new DuplicateEmailError(params.email);
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
