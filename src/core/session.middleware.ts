import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../shared/errors.ts";

const BEARER_PATTERN = /^Bearer\s+(?<token>\S+)$/iu;
const SESSION_USER_KEY = "sessionUser";

type SessionResolver = (token: string) => unknown;

const readBearerToken = (req: Readonly<Request>): string => {
  const header = req.get("authorization");
  if (header === undefined) throw new ApiError(401, "Authentication required");
  const token = BEARER_PATTERN.exec(header.trim())?.groups?.["token"];
  if (token === undefined) throw new ApiError(401, "Invalid authorization header");
  return token;
};

/** Creates Express session middleware while keeping session lookup outside core. */
export const createSessionMiddleware = (resolveSession: SessionResolver): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.locals[SESSION_USER_KEY] = resolveSession(readBearerToken(req));
      next();
    } catch (error) {
      next(error);
    }
  };
};
