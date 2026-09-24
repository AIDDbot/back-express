import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createLogger, type LogLevel, type Logger } from "../shared/logger.js";

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;

const levelForStatus = (status: number): LogLevel => {
  if (status >= SERVER_ERROR_MIN) return "error";
  if (status >= CLIENT_ERROR_MIN) return "warn";
  return "info";
};

/** Logs one line per request once the response has been sent. */
export const requestLogger =
  (logger: Readonly<Logger> = createLogger("http")): RequestHandler =>
    (req: Readonly<Request>, res: Readonly<Response>, next: NextFunction): void => {
      const start = performance.now();
      res.on("finish", () => {
        const duration = Math.round(performance.now() - start);
        const status = res.statusCode;
        logger[levelForStatus(status)](`${req.method.padEnd(4, " ")} "${req.originalUrl}" ${status} ${duration} ms`);
      });
      next();
    };
