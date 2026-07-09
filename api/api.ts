import { Router } from "express";
import { getHealth } from "./health/health.controller.js";

export const apiRouter: Router = Router();

apiRouter.get("/health", getHealth);

