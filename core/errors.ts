import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  public readonly status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface HttpError {
  statusCode?: number;
  expose?: boolean;
  message?: string;
}

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;

const pickBadRequestMessage = (
  expose: boolean | undefined,
  message: string | undefined,
): string => {
  if (expose && message) {
    return message;
  }
  return "Bad request";
};

// oxlint-disable-next-line eslint/max-params -- Express detects error middleware by arity; it must take exactly 4 params.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  /* Http-errors convention used by body-parser and friends (e.g. malformed JSON). */
  const { statusCode, expose, message } = (err ?? {}) as HttpError;
  if (
    typeof statusCode === "number" &&
    statusCode >= CLIENT_ERROR_MIN &&
    statusCode < SERVER_ERROR_MIN
  ) {
    res.status(statusCode).json({ error: pickBadRequestMessage(expose, message) });
    return;
  }
  process.stderr.write(`${String(err)}\n`);
  res.status(SERVER_ERROR_MIN).json({ error: "Internal server error" });
};
