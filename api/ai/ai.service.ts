import type { AiReply } from "./ai.types.js";

export const generateReply = (prompt: string): AiReply => ({ reply: `You said: ${prompt}` });
