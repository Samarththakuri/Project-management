import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/utils/api-error.js";
import { ApiResponse } from "../../src/utils/api-response.js";
import { asyncHandler } from "../../src/utils/async-handler.js";

describe("ApiError", () => {
  it("carries the status code, message and error list", () => {
    const err = new ApiError(422, "Validation failed", [{ path: "email" }]);

    expect(err).toBeInstanceOf(Error);
    expect(err.statuscode).toBe(422);
    expect(err.message).toBe("Validation failed");
    expect(err.error).toEqual([{ path: "email" }]);
    expect(err.data).toBeNull();
  });

  it("defaults message and error list", () => {
    const err = new ApiError(500);

    expect(err.message).toBe("Something went wrong");
    expect(err.error).toEqual([]);
  });

  it("captures a stack trace when none is supplied", () => {
    expect(new ApiError(400, "bad").stack).toBeTruthy();
  });

  it("uses an explicitly provided stack", () => {
    expect(new ApiError(400, "bad", [], "custom-stack").stack).toBe(
      "custom-stack",
    );
  });
});

describe("ApiResponse", () => {
  it("wraps data with a default success message", () => {
    const res = new ApiResponse(200, { id: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.data).toEqual({ id: 1 });
    expect(res.message).toBe("Success");
    expect(res.success).toBe(true);
  });

  it("accepts a custom message", () => {
    expect(new ApiResponse(201, {}, "Created").message).toBe("Created");
  });
});

describe("asyncHandler", () => {
  it("invokes the wrapped handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();

    await asyncHandler(handler)({}, {}, next);

    expect(handler).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards a rejected promise to next()", async () => {
    const boom = new Error("boom");
    const next = vi.fn();

    asyncHandler(() => Promise.reject(boom))({}, {}, next);
    // Let the rejection propagate through the microtask queue.
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(boom);
  });

  it("forwards a synchronous throw to next()", async () => {
    const boom = new Error("sync boom");
    const next = vi.fn();

    await asyncHandler(async () => {
      throw boom;
    })({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(boom);
  });
});
