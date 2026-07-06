import { test } from "node:test";
import assert from "node:assert";
import { ApiError } from "../../shared/errors.js";
import { postAi } from "./ai.controller.js";

void test("ai controller", async (t) => {
  await t.test("postAi replies with the echoed prompt", () => {
    let jsonData: unknown;
    const mockReq = { body: { prompt: "hello" } };
    const mockRes = {
      json: (data: unknown) => {
        jsonData = data;
      },
    };

    postAi(mockReq as any, mockRes as any);

    assert.deepStrictEqual(jsonData, { reply: "You said: hello" });
  });

  await t.test("postAi throws 400 when prompt is missing", () => {
    const mockReq = { body: {} };
    const mockRes = { json: () => {} };

    assert.throws(
      () => postAi(mockReq as any, mockRes as any),
      (err: unknown) => err instanceof ApiError && err.status === 400,
      "should throw an ApiError with status 400",
    );
  });

  await t.test("postAi throws 400 when prompt is blank or not a string", () => {
    const invalidBodies = [{ prompt: "   " }, { prompt: 42 }, undefined];

    for (const body of invalidBodies) {
      const mockReq = { body };
      const mockRes = { json: () => {} };

      assert.throws(
        () => postAi(mockReq as any, mockRes as any),
        (err: unknown) => err instanceof ApiError && err.status === 400,
        `should reject body ${JSON.stringify(body)}`,
      );
    }
  });
});
