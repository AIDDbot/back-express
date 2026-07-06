import { test } from "node:test";
import assert from "node:assert";
import { generateReply } from "./ai.service.js";

void test("ai service", async (t) => {
  await t.test("generateReply echoes the prompt", () => {
    const result = generateReply("hello");

    assert.deepStrictEqual(result, { reply: "You said: hello" });
  });

  await t.test("generateReply has valid structure", () => {
    const result = generateReply("anything");

    assert.deepStrictEqual(Object.keys(result), ["reply"], "should only have reply property");
    assert.ok(typeof result.reply === "string", "reply should be a string");
  });
});
