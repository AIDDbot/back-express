import type { Request, Response } from "express";
import { loginUser, registerUser } from "./auth.service.js";

const CREATED = 201;

export const postRegister = async (
  req: Readonly<Request>,
  res: Readonly<Response>,
): Promise<void> => {
  const user = await registerUser(req.body);
  res.status(CREATED).json(user);
};

export const postLogin = async (req: Readonly<Request>, res: Readonly<Response>): Promise<void> => {
  const session = await loginUser(req.body);
  res.json(session);
};
