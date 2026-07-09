import { apiRouter } from "./api/api.js";
import cors from "cors";
import { errorHandler } from "./server/errors.js";
import express from "express";
import { listen } from "./server/listener.js";
import { port } from "./server/config.js";
import { startHealthTracking } from "./api/health/health.service.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

startHealthTracking();
listen(app, port);
