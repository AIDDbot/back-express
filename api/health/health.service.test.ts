import { test } from "node:test";
import assert from "node:assert";
import { getHealthStatus, startHealthTracking } from "./health.service.js";

void test("health service", async (t) => {
  startHealthTracking();

  await t.test("getHealthStatus returns health status object", () => {
    const result = getHealthStatus();

    assert.ok(result, "should return a result");
    assert.ok(typeof result.uptime === "number", "uptime should be a number");
    assert.ok(result.uptime > 0, "uptime should be greater than 0");
    assert.ok(typeof result.runs === "number", "runs should be a number");
  });

  await t.test("getHealthStatus has valid structure", () => {
    const result = getHealthStatus();

    assert.ok(Object.keys(result).includes("uptime"), "should include uptime property");
    assert.ok(Object.keys(result).includes("runs"), "should include runs property");
    assert.deepStrictEqual(
      Object.keys(result).sort(),
      ["runs", "uptime"],
      "should only have uptime and runs properties",
    );
  });
});
