import type { NextFunction, Request, Response } from "express";
import { coerceToFiniteNumber } from "../shared/type.utils.js";

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

const getHttpError = (err: unknown): HttpError => err ?? {};

const toStatusCode = (http: HttpError): number =>
  coerceToFiniteNumber((http as any).statusCode, CLIENT_ERROR_MIN);

const isClientError = (status: number): boolean =>
  status >= CLIENT_ERROR_MIN && status < SERVER_ERROR_MIN;
const handleApiError = (err: unknown, res: Response): boolean => {
  if (!(err instanceof ApiError)) return false;
  res.status(err.status).json({ error: err.message });
  return true;
};

const handleClientError = (err: unknown, res: Response): boolean => {
  const http = getHttpError(err);
  const status = toStatusCode(http);
  if (!isClientError(status)) return false;
  res.status(status).json({ error: pickBadRequestMessage(http.expose, http.message) });
  return true;
};

const handleServerError = (err: unknown, res: Response): void => {
  process.stderr.write(`${String(err)}\n`);
  res.status(SERVER_ERROR_MIN).json({ error: "Internal server error" });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (handleApiError(err, res)) return;
  if (handleClientError(err, res)) return;
  handleServerError(err, res);
};
