import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../shared/errors.js";
import { findSessionUser } from "./auth.service.js";
import type { User } from "./auth.types.js";

declare global {
  namespace Express {
    /** Set by `requireSession`; read it through `getSessionUser(res)`. */
    interface Locals {
      sessionUser?: User;
    }
  }
}

const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)$/iu;

const readBearerToken = (req: Readonly<Request>): string => {
  const header = req.get("authorization");
  if (header === undefined) throw new ApiError(401, "Authentication required");
  const token = BEARER_PATTERN.exec(header.trim())?.groups?.["token"];
  if (token === undefined) throw new ApiError(401, "Invalid authorization header");
  return token;
};

/**
 * Express middleware for protected routes: requires `Authorization: Bearer <token>`
 * for an existing session, then exposes the user through `getSessionUser(res)`.
 * Any failure reaches the error handler as a 401 `{ error }`.
 */
export const requireSession = (
  req: Readonly<Request>,
  res: Readonly<Response>,
  next: NextFunction,
): void => {
  try {
    res.locals.sessionUser = findSessionUser(readBearerToken(req));
    next();
  } catch (error) {
    next(error);
  }
};

/** The authenticated user of a request that went through `requireSession`. */
export const getSessionUser = (res: Readonly<Response>): User => {
  const user = res.locals.sessionUser;
  if (!user) throw new Error("getSessionUser called on a route without requireSession");
  return user;
};
