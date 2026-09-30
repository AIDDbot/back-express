import cors from "cors";
import express, { type Request, type Response } from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createApiRouter } from "./api/api.js";
import { findSessionUser, startAuthTracking } from "./api/auth/auth.service.js";
import { startHealthTracking } from "./api/health/health.service.js";
import { errorHandler } from "./core/error-handler.js";
import { listen } from "./core/listener.js";
import { requestLogger } from "./core/request-logger.js";
import { createSessionMiddleware } from "./core/session.middleware.js";
import { API_BASE_PATH, CORS_ORIGIN, PORT } from "./shared/config.js";
import { createLogger } from "./shared/logger.js";

const app = express();
const origin = typeof CORS_ORIGIN === "string" ? CORS_ORIGIN : [...CORS_ORIGIN];
app.use(cors({ origin }));
app.use(express.json());
app.use(requestLogger());

const logo = readFileSync(join(import.meta.dirname, "logo.png"));
app.get("/favicon.ico", (_req: Readonly<Request>, res: Readonly<Response>): void => {
  res.type("image/png").send(logo);
});

app.use(API_BASE_PATH, createApiRouter(createSessionMiddleware(findSessionUser)));

app.use(errorHandler());
try {
  startHealthTracking();
  startAuthTracking();
  listen(app, PORT);
} catch (error) {
  const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
  createLogger("server").error(reason);
  process.exit(1);
}
