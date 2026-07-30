import { Router } from "express";
import { getHealth } from "./health/health.controller.js";

const createRouter = Router;
export const apiRouter: Router = createRouter();

apiRouter.get("/health", getHealth);

