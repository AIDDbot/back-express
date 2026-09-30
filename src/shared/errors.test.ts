import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ApiError } from "./errors.js";

void describe("ApiError", () => {
  void it("preserves the status and message while remaining an Error", () => {
    const error = new ApiError(422, "Invalid input");

    assert.ok(error instanceof Error);
    assert.ok(error instanceof ApiError);
    assert.equal(error.name, "ApiError");
    assert.equal(error.status, 422);
    assert.equal(error.message, "Invalid input");
  });
});
