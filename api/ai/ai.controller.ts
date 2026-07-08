import type { Request, Response } from "express";
import type { AiRequest } from "./ai.types.js";
import { ApiError } from "../../shared/errors.js";
import { generateReply } from "./ai.service.js";

export const postAi = (req: Request, res: Response): void => {
  
  const { prompt } = (req.body ?? {}) as Partial<AiRequest>;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new ApiError(400, "prompt must be a non-empty string");
  }
  res.json(generateReply(prompt));
};
