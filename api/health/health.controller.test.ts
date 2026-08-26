import type { Request, Response } from "express";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { getHealth } from "./health.controller.js";
import { startHealthTracking } from "./health.service.js";

const UNSET = Symbol("unset"),

 assertHasHealthShape = (status: Record<string, unknown>): void => {
  assert.ok("uptime" in status, "should include uptime property");
  assert.ok("runs" in status, "should include runs property");
  assert.ok(typeof status["uptime"] === "number", "uptime should be a number");
  assert.ok(typeof status["runs"] === "number", "runs should be a number");
};

describe("health controller", () => {
  startHealthTracking();

  it("getHealth returns a function", () => {
    assert.ok(typeof getHealth === "function", "should export a function");
  });

  it("getHealth handler calls res.json with health status", () => {
    let jsonData: unknown | typeof UNSET = UNSET;
    const mockReq = {},
     mockRes = {
      json: (data: unknown): void => {
        jsonData = data;
      },
    };

    getHealth(mockReq as unknown as Request, mockRes as unknown as Response);

    assert.notStrictEqual(jsonData, UNSET, "should call res.json with data");
    assert.ok(
      typeof jsonData === "object" && jsonData !== null,
      "should pass an object to res.json",
    );

    assertHasHealthShape(jsonData as Record<string, unknown>);
  });
});
