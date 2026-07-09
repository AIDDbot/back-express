import { Router } from "express";
import { getHealth } from "./health/health.controller.js";
import { postAi } from "./ai/ai.controller.js";

export const apiRouter: Router = Router();

apiRouter.get("/health", getHealth);
apiRouter.post("/ai", postAi);
