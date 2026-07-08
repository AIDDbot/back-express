import { Router } from "express";
import { getHealth } from "./health/health.controller.js";
import { postAi } from "./ai/ai.controller.js";

// oxlint-disable-next-line eslint/new-cap -- Express's Router is a factory function, not a constructor.
export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.post("/ai", postAi);
