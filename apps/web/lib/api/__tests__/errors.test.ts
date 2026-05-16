import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@battleship/core";

// Mock next/server at the boundary — it has side-effects when imported in Node.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

const { apiErrorResponse, handleApiError } = await import("../errors");

describe("apiErrorResponse", () => {
  it("returns the ApiError status code", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing");
    const res = apiErrorResponse(err) as any;
    expect(res.status).toBe(404);
  });

  it("wraps code and message in an 'error' envelope", () => {
    const err = new ApiError(400, "BAD_REQUEST", "invalid input");
    const res = apiErrorResponse(err) as any;
    expect(res.body).toEqual({ error: { code: "BAD_REQUEST", message: "invalid input" } });
  });
});

describe("handleApiError", () => {
  it("delegates to apiErrorResponse for ApiError instances", () => {
    const err = new ApiError(409, "CONFLICT", "already joined");
    const res = handleApiError(err) as any;
    expect(res.status).toBe(409);
  });

  it("returns 500 INTERNAL for unexpected errors", () => {
    const res = handleApiError(new Error("boom")) as any;
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL");
  });

  it("returns 500 INTERNAL for non-Error thrown values", () => {
    const res = handleApiError("string error") as any;
    expect(res.status).toBe(500);
  });
});
