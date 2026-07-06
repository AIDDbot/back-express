import { test } from "node:test";
import assert from "node:assert";
import { getHealth } from "./health.controller.js";
import { startHealthTracking } from "./health.service.js";

void test("health controller", async (t) => {
  startHealthTracking();

  await t.test("getHealth returns a function", () => {
    assert.ok(typeof getHealth === "function", "should export a function");
  });

  await t.test("getHealth handler calls res.json with health status", async () => {
    let jsonData: unknown;
    const mockReq = {};
    const mockRes = {
      json: (data: unknown) => {
        jsonData = data;
      },
    };

    getHealth(mockReq as any, mockRes as any);

    assert.ok(jsonData, "should call res.json with data");
    assert.ok(
      typeof jsonData === "object" && jsonData !== null,
      "should pass an object to res.json",
    );

    const status = jsonData as Record<string, unknown>;
    assert.ok("uptime" in status, "should include uptime property");
    assert.ok("runs" in status, "should include runs property");
    assert.ok(typeof status.uptime === "number", "uptime should be a number");
    assert.ok(typeof status.runs === "number", "runs should be a number");
  });
});
