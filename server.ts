import express from "express";
import { apiRouter } from "./api/api.js";
import { serveTsAsJs } from "./core/serve-ts.js";
import { clientSrc, port } from "./shared/config.js";

const app = express();
app.use(express.json());
app.use(serveTsAsJs);
app.use(express.static(clientSrc));

app.use("/api", apiRouter);

// SPA fallback: client-side routes (no extension, non-API) get index.html
app.get("*splat", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.includes(".")) return next();
  res.sendFile("index.html", { root: clientSrc });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
