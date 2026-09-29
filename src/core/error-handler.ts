import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors.js";
import { createLogger, type Logger } from "../shared/logger.js";
import { isRecord } from "../shared/guard.utils.js";
import { coerceToFiniteNumber } from "../shared/type.utils.js";

/** The fields Express and http-errors put on a thrown error, narrowed at runtime. */
interface HttpError {
  status: number;
  expose: boolean;
  message: string | undefined;
}

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;
const pickBadRequestMessage = (http: Readonly<HttpError>): string => {
  if (http.expose && http.message) {
    return http.message;
  }
  return "Bad request";
};

const toHttpError = (err: unknown): HttpError => {
  const fields: Record<string, unknown> = isRecord(err) ? err : {};
  const message = fields["message"];
  return {
    expose: fields["expose"] === true,
    message: typeof message === "string" ? message : undefined,
    status: coerceToFiniteNumber(fields["statusCode"], SERVER_ERROR_MIN),
  };
};

const isClientError = (status: number): boolean =>
  status >= CLIENT_ERROR_MIN && status < SERVER_ERROR_MIN;
const handleApiError = (err: unknown, res: Readonly<Response>): boolean => {
  if (!(err instanceof ApiError)) return false;
  res.status(err.status).json({ error: err.message });
  return true;
};

const handleClientError = (err: unknown, res: Readonly<Response>): boolean => {
  const http = toHttpError(err);
  if (!isClientError(http.status)) return false;
  res.status(http.status).json({ error: pickBadRequestMessage(http) });
  return true;
};

const handleServerError = (
  err: unknown,
  res: Readonly<Response>,
  logger: Readonly<Logger>,
): void => {
  const errorMessage = err instanceof Error ? err.message : "Unknown error";
  logger.error(errorMessage);
  res.status(SERVER_ERROR_MIN).json({ error: "Internal server error" });
};

/**
 * Last middleware: answers every error as `{ error }`. Unexpected ones become a 500
 * logged through `logger`. Express spots error handlers by their four parameters.
 */
export const errorHandler =
  (logger: Readonly<Logger> = createLogger("api")): ErrorRequestHandler =>
  (err: unknown, _req: Readonly<Request>, res: Readonly<Response>, _next: NextFunction): void => {
    if (handleApiError(err, res)) return;
    if (handleClientError(err, res)) return;
    handleServerError(err, res, logger);
  };
