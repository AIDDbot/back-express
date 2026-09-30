import type { Response } from "express";
import { isPublicUser, type User } from "./auth.types.js";

declare global {
  namespace Express {
    /** Set by core session middleware; read through `getSessionUser`. */
    interface Locals {
      sessionUser?: unknown;
    }
  }
}

/** The authenticated user of a request protected by the session middleware. */
export const getSessionUser = (res: Readonly<Response>): User => {
  const user = res.locals.sessionUser;
  if (!isPublicUser(user)) {
    throw new Error("getSessionUser called on a route without session middleware");
  }
  return user;
};
