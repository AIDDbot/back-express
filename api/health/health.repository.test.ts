import assert from "node:assert";
import { describe, it } from "node:test";
import { getRunsCount, initHealthRepository, recordRun } from "./health.repository.js";

const MIN_COUNT = 0,
  MIN_INCREMENT = 1;

void describe("health repository", () => {
  initHealthRepository();

  void it("getRunsCount returns a number", () => {
    const result = getRunsCount();

    assert.ok(typeof result === "number", "should return a number");
    assert.ok(result >= MIN_COUNT, "count should be non-negative");
  });

  void it("getRunsCount is deterministic across calls", () => {
    const firstCall = getRunsCount(),
      secondCall = getRunsCount();

    assert.strictEqual(firstCall, secondCall, "count should be the same on consecutive calls");
  });

  void it("recordRun increases the count", () => {
    const before = getRunsCount();
    recordRun();
    const after = getRunsCount();

    /* Other test worker processes share the db file, so only assert growth. */
    assert.ok(after >= before + MIN_INCREMENT, "should have recorded at least one more run");
  });
});
