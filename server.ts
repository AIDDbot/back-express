import cors from "cors";
import express from "express";
import { apiRouter } from "./api/api.js";
import { startHealthTracking } from "./api/health/health.service.js";
import { port } from "./shared/config.js";
import { errorHandler } from "./shared/errors.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

startHealthTracking();
app.listen(port, () => console.log(`Check server health at http://localhost:${port}/api/health`));
