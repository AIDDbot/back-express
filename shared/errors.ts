import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type HttpError = { statusCode?: number; expose?: boolean; message?: string };

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // http-errors convention used by body-parser and friends (e.g. malformed JSON).
  const { statusCode, expose, message } = (err ?? {}) as HttpError;
  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
    res.status(statusCode).json({ error: expose && message ? message : "Bad request" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
