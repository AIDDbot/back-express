import { Router, type RequestHandler } from "express";
import { getMe, postLogin, postRegister } from "./auth/auth.controller.ts";
import { getHealth } from "./health/health.controller.ts";

export const createApiRouter = (requireSession: RequestHandler): Router => {
  const apiRouter = Router();

  apiRouter.get("/health", getHealth);
  apiRouter.post("/auth/register", postRegister);
  apiRouter.post("/auth/login", postLogin);
  apiRouter.use(requireSession);
  apiRouter.get("/auth/me", getMe);

  return apiRouter;
};
