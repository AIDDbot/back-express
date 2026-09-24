import cors from "cors";
import express from "express";
import { apiRouter } from "./api/api.js";
import { startAuthTracking } from "./api/auth/auth.service.js";
import { startHealthTracking } from "./api/health/health.service.js";
import { listen } from "./server/listener.js";
import { requestLogger } from "./server/request-logger.js";
import { port } from "./shared/config.js";
import { errorHandler, setErrorsLogger } from "./shared/errors.js";
import { createLogger } from "./shared/logger.js";

// Inject logger into error handler
setErrorsLogger(createLogger("api"));

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger());

app.use("/api", apiRouter);

app.use(errorHandler);
try {
  startHealthTracking();
  startAuthTracking();
  listen(app, port);
} catch (error) {
  createLogger("server").error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
