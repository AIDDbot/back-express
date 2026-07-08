import { describe, it } from "node:test";
import assert from "node:assert";
import { generateReply } from "./ai.service.js";

describe("ai service", () => {
  it("generateReply echoes the prompt", () => {
    const result = generateReply("hello");

    assert.deepStrictEqual(result, { reply: "You said: hello" });
  });

  it("generateReply has valid structure", () => {
    const result = generateReply("anything");

    assert.deepStrictEqual(Object.keys(result), ["reply"], "should only have reply property");
    assert.ok(typeof result.reply === "string", "reply should be a string");
  });
});
