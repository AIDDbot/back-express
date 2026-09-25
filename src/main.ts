import cors from "cors";
import express from "express";
import { apiRouter } from "./api/api.js";
import { startAuthTracking } from "./api/auth/auth.service.js";
import { startHealthTracking } from "./api/health/health.service.js";
import { listen } from "./server/listener.js";
import { requestLogger } from "./server/request-logger.js";
import { API_BASE_PATH, CORS_ORIGIN, PORT } from "./shared/config.js";
import { errorHandler, setErrorsLogger } from "./shared/errors.js";
import { createLogger } from "./shared/logger.js";

// Inject logger into error handler
setErrorsLogger(createLogger("api"));

const app = express();
const origin = typeof CORS_ORIGIN === "string" ? CORS_ORIGIN : [...CORS_ORIGIN];
app.use(cors({ origin }));
app.use(express.json());
app.use(requestLogger());

app.use(API_BASE_PATH, apiRouter);

app.use(errorHandler);
try {
  startHealthTracking();
  startAuthTracking();
  listen(app, PORT);
} catch (error) {
  createLogger("server").error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
