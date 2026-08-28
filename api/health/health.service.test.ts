import assert from "node:assert";
import { describe, it } from "node:test";
import { getHealthStatus, startHealthTracking } from "./health.service.js";

const MIN_UPTIME = 0;

void describe("health service", () => {
  startHealthTracking();

  void it("getHealthStatus returns health status object", () => {
    const result = getHealthStatus();

    assert.ok(result, "should return a result");
    assert.ok(typeof result.uptime === "number", "uptime should be a number");
    assert.ok(result.uptime > MIN_UPTIME, "uptime should be greater than 0");
    assert.ok(typeof result.runs === "number", "runs should be a number");
  });

  void it("getHealthStatus has valid structure", () => {
    const result = getHealthStatus();

    assert.ok(Object.keys(result).includes("uptime"), "should include uptime property");
    assert.ok(Object.keys(result).includes("runs"), "should include runs property");
    assert.deepStrictEqual(
      Object.keys(result).toSorted(),
      ["runs", "uptime"],
      "should only have uptime and runs properties",
    );
  });
});
