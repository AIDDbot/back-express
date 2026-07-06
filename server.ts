import cors from "cors";
import express from "express";
import { apiRouter } from "./api/api.js";
import { port } from "./shared/config.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);


app.listen(port, () => console.log(`Check server healths at http://localhost:${port}/api/health`));
