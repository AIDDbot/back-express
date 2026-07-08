import { describe, it } from "node:test";
import { getHealthStatus, startHealthTracking } from "./health.service.js";
import assert from "node:assert";

const MIN_UPTIME = 0;

describe("health service", () => {
  startHealthTracking();

  it("getHealthStatus returns health status object", () => {
    const result = getHealthStatus();

    assert.ok(result, "should return a result");
    assert.ok(typeof result.uptime === "number", "uptime should be a number");
    assert.ok(result.uptime > MIN_UPTIME, "uptime should be greater than 0");
    assert.ok(typeof result.runs === "number", "runs should be a number");
  });

  it("getHealthStatus has valid structure", () => {
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
