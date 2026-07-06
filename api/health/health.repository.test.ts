import { test } from "node:test";
import assert from "node:assert";
import { getRunsCount } from "./health.repository.js";

void test("health repository", async (t) => {
  await t.test("getRunsCount returns a number", () => {
    const result = getRunsCount();

    assert.ok(typeof result === "number", "should return a number");
    assert.ok(result >= 0, "count should be non-negative");
  });

  await t.test("getRunsCount is deterministic across calls", () => {
    const firstCall = getRunsCount();
    const secondCall = getRunsCount();

    assert.strictEqual(firstCall, secondCall, "count should be the same on consecutive calls");
  });

  await t.test("getRunsCount increases after service initialization", () => {
    // The health.service module calls recordRun() on import,
    // so the count should be at least 1 when tested
    const count = getRunsCount();
    assert.ok(count > 0, "should have recorded at least one run");
  });
});
