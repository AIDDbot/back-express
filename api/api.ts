import { Router } from "express";
import { postLogin, postRegister } from "./auth/auth.controller.js";
import { getHealth } from "./health/health.controller.js";

const createRouter = Router;
export const apiRouter: Router = createRouter();

apiRouter.get("/health", getHealth);
apiRouter.post("/auth/register", postRegister);
apiRouter.post("/auth/login", postLogin);
