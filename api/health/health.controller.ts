import type { Request, Response } from "express";
import { getHealthStatus } from "./health.service.js";

export const getHealth = (_req: Request, res: Response): void => {
  const healthStatus = getHealthStatus();
  res.json(healthStatus);
};
