import { apiRouter } from "./api/api.js";
import cors from "cors";
import { errorHandler } from "./shared/errors.js";
import express from "express";
import { port } from "./shared/config.js";
import { startHealthTracking } from "./api/health/health.service.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

startHealthTracking();
app.listen(port, () =>
  process.stdout.write(`Check server health at http://localhost:${port}/api/health\n`),
);
