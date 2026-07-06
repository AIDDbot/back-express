import { readFileSync, statSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { clientSrc } from "../shared/config.js";

const cache = new Map<string, { mtimeMs: number; js: string }>();

export function serveTsAsJs(req: Request, res: Response, next: NextFunction) {
  if (!req.path.endsWith(".js")) return next();

  const tsPath = join(clientSrc, req.path.replace(/\.js$/, ".ts"));
  let mtimeMs: number;
  try {
    mtimeMs = statSync(tsPath).mtimeMs;
  } catch {
    return next();
  }

  const cached = cache.get(tsPath);
  const js =
    cached && cached.mtimeMs === mtimeMs
      ? cached.js
      : stripTypeScriptTypes(readFileSync(tsPath, "utf8"), { mode: "strip" });

  cache.set(tsPath, { mtimeMs, js });
  res.type("text/javascript").send(js);
}
