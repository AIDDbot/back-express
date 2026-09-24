export type UserRole = "user";

const ROLES: readonly UserRole[] = ["user"];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Wire format of a registered user; never includes the password hash. */
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

/** Request body of POST /api/auth/register */
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

/** Request body of POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Wire format of POST /api/auth/login success response */
export interface Session {
  token: string;
  user: User;
}
