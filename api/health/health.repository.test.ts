import { test } from "node:test";
import assert from "node:assert";
import { getRunsCount, initHealthRepository, recordRun } from "./health.repository.js";

void test("health repository", async (t) => {
  initHealthRepository();

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

  await t.test("recordRun increases the count", () => {
    const before = getRunsCount();
    recordRun();
    const after = getRunsCount();

    // Other test worker processes share the db file, so only assert growth.
    assert.ok(after >= before + 1, "should have recorded at least one more run");
  });
});
