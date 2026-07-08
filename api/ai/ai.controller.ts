import type { Request, Response } from "express";
import type { AiRequest } from "./ai.types.js";
import { ApiError } from "../../shared/errors.js";
import { generateReply } from "./ai.service.js";

const EMPTY_LENGTH = 0;
const BAD_REQUEST = 400;

export const postAi = (req: Request, res: Response): void => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- body-parser types req.body as any; the fields are validated below before use.
  const { prompt } = (req.body ?? {}) as Partial<AiRequest>;
  if (typeof prompt !== "string" || prompt.trim().length === EMPTY_LENGTH) {
    throw new ApiError(BAD_REQUEST, "prompt must be a non-empty string");
  }
  res.json(generateReply(prompt));
};
