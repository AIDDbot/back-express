import type { Request, Response } from "express";
import { describe, it } from "node:test";
import { ApiError } from "../../core/errors.js";
import assert from "node:assert";
import { postAi } from "./ai.controller.js";

const BAD_REQUEST = 400;

describe("ai controller", () => {
  it("postAi replies with the echoed prompt", () => {
    let jsonData: unknown;
    const mockReq = { body: { prompt: "hello" } };
    const mockRes = {
      json: (data: unknown): void => {
        jsonData = data;
      },
    };

    postAi(mockReq as unknown as Request, mockRes as unknown as Response);

    assert.deepStrictEqual(jsonData, { reply: "You said: hello" });
  });

  it("postAi throws 400 when prompt is missing", () => {
    const mockReq = { body: {} };
    const mockRes = {
      json: (): void => {
        /* No-op */
      },
    };

    assert.throws(
      () => postAi(mockReq as unknown as Request, mockRes as unknown as Response),
      (err: unknown) => err instanceof ApiError && err.status === BAD_REQUEST,
      "should throw an ApiError with status 400",
    );
  });

  it("postAi throws 400 when prompt is blank or not a string", () => {
    const invalidRequests: { body?: unknown }[] = [
      { body: { prompt: "   " } },
      { body: { prompt: 42 } },
      {},
    ];

    for (const mockReq of invalidRequests) {
      const mockRes = {
        json: (): void => {
          /* No-op */
        },
      };

      assert.throws(
        () => postAi(mockReq as unknown as Request, mockRes as unknown as Response),
        (err: unknown) => err instanceof ApiError && err.status === BAD_REQUEST,
        `should reject body ${JSON.stringify(mockReq.body)}`,
      );
    }
  });
});
