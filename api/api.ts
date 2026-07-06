import { Router } from "express";
import { postAi } from "./ai/ai.controller.js";
import { getHealth } from "./health/health.controller.js";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.post("/ai", postAi);
