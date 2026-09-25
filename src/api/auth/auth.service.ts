import { ApiError } from "../../shared/errors.js";
import { isNonEmptyString, isRecord } from "../../shared/guard.utils.js";
import { createLogger } from "../../shared/logger.js";
import {
  findUserByEmail,
  initAuthRepository,
  insertSession,
  insertUser,
  type UserRecord,
} from "./auth.repository.js";
import {
  isUserRole,
  type LoginRequest,
  type RegisterRequest,
  type Session,
  type User,
} from "./auth.types.js";

const INVALID_CREDENTIALS = "Invalid credentials";
const USER_ROLE = "user";
const log = createLogger("auth");

/**
 * Fixed-cost dummy hash, computed once per process with the same parameters
 * as a real hash. Verifying against it when no user is found keeps an
 * unknown-email login as slow as a wrong-password login (T0004).
 */
const DUMMY_PASSWORD_HASH = Bun.password.hashSync("dummy-password-for-timing-parity", {
  algorithm: "argon2id",
});

export const startAuthTracking = (): void => {
  initAuthRepository();
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Exported so tests can exercise the invalid-stored-role branch with a mocked record (T0006). */
export const toPublicUser = (record: Readonly<UserRecord>): User => {
  if (!isUserRole(record.role)) {
    log.error(`Invalid role for user ${record.id}: ${record.role}`);
    throw new Error(`Stored user ${record.id} has an invalid role: ${record.role}`);
  }
  return {
    createdAt: record.createdAt,
    email: record.email,
    id: record.id,
    name: record.name,
    role: record.role,
  };
};

const validateRegisterRequest = (body: unknown): RegisterRequest => {
  const candidate = isRecord(body) ? body : {};
  const { email, name, password } = candidate;
  if (!isNonEmptyString(email) || !isNonEmptyString(name) || !isNonEmptyString(password)) {
    throw new ApiError(400, "Email, name, and password are required");
  }
  return { email, name, password };
};

export const registerUser = async (body: unknown): Promise<User> => {
  const request = validateRegisterRequest(body);
  const email = normalizeEmail(request.email);

  const existing = findUserByEmail(email);
  if (existing) {
    log.warn("Registration rejected: email already registered");
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await Bun.password.hash(request.password, { algorithm: "argon2id" });
  const record = insertUser({ email, name: request.name, passwordHash, role: USER_ROLE });
  log.info(`User registered: ${record.id}`);
  return toPublicUser(record);
};

const validateLoginRequest = (body: unknown): LoginRequest => {
  const candidate = isRecord(body) ? body : {};
  const { email, password } = candidate;
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new ApiError(400, "Email and password are required");
  }
  return { email, password };
};

export const loginUser = async (body: unknown): Promise<Session> => {
  const request = validateLoginRequest(body);
  const email = normalizeEmail(request.email);

  const record = findUserByEmail(email);
  const hashToVerify = record ? record.passwordHash : DUMMY_PASSWORD_HASH;
  const isValid = await Bun.password.verify(request.password, hashToVerify);
  if (!record || !isValid) {
    log.warn("Login failed: invalid credentials");
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  const token = crypto.randomUUID();
  insertSession({ token, userId: record.id });
  log.info(`User logged in: ${record.id}`);
  return { token, user: toPublicUser(record) };
};
