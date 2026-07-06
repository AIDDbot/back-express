import type { AiReply } from "./ai.types.js";

export function generateReply(prompt: string): AiReply {
  return { reply: `You said: ${prompt}` };
}
