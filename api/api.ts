import { Router } from "express";
import { getHealth } from "./health/health.controller.js";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);

apiRouter.post("/ai", (req, res) => {
  const { prompt } = req.body;
  res.json({ reply: `You said: ${prompt}` });
});
