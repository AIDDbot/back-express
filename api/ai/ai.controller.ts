import type { Request, Response } from "express";
import type { AiRequest } from "./ai.types.js";
import { ApiError } from "../../server/errors.js";
import { generateReply } from "./ai.service.js";

const BAD_REQUEST = 400;

export const postAi = (req: Request, res: Response): void => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- req.body is untrusted `any`; shape is verified below before use.
  const { prompt } = (req.body ?? {}) as Partial<AiRequest>;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new ApiError(BAD_REQUEST, "prompt must be a non-empty string");
  }
  res.json(generateReply(prompt));
};
