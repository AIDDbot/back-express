import type { NextFunction, Request, Response } from "express";
import { coerceToFiniteNumber } from "../shared/type.utils.js";
import type { Logger } from "./logger.js";

let log: Logger | null = null;

/**
 * Set the logger instance for error handling.
 * Must be called before any errors are handled.
 */
export const setErrorsLogger = (logger: Logger): void => {
  log = logger;
};

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
  expose: Readonly<boolean | undefined>,
  message: Readonly<string | undefined>,
): string => {
  if (expose && message) {
    return message;
  }
  return "Bad request";
};

const getHttpError = (err: Readonly<unknown>): HttpError => err ?? {};

const toStatusCode = (http: Readonly<HttpError>): number =>
  coerceToFiniteNumber(http.statusCode, SERVER_ERROR_MIN);

const isClientError = (status: number): boolean =>
  status >= CLIENT_ERROR_MIN && status < SERVER_ERROR_MIN;
const handleApiError = (err: Readonly<unknown>, res: Readonly<Response>): boolean => {
  if (!(err instanceof ApiError)) return false;
  res.status(err.status).json({ error: err.message });
  return true;
};

const handleClientError = (err: Readonly<unknown>, res: Readonly<Response>): boolean => {
  const http = getHttpError(err);
  const status = toStatusCode(http);
  if (!isClientError(status)) return false;
  res.status(status).json({ error: pickBadRequestMessage(http.expose, http.message) });
  return true;
};

const handleServerError = (err: Readonly<unknown>, res: Readonly<Response>): void => {
  const errorMessage = err instanceof Error ? err.message : "Unknown error";
  log?.error(errorMessage);
  res.status(SERVER_ERROR_MIN).json({ error: "Internal server error" });
};

export const errorHandler = (
  err: Readonly<unknown>,
  _req: Readonly<Request>,
  res: Readonly<Response>,
  _next: Readonly<NextFunction>,
): void => {
  if (handleApiError(err, res)) return;
  if (handleClientError(err, res)) return;
  handleServerError(err, res);
};
