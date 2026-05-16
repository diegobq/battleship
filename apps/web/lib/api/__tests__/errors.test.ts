import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@battleship/core";

// Mock next/server before importing the module under test.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const { apiErrorResponse, handleApiError } = await import("../errors");

describe("apiErrorResponse", () => {
  it("returns the error status from the ApiError", () => {
    const err = new ApiError(404, "NOT_FOUND", "not found");
    const res = apiErrorResponse(err);
    expect(res.status).toBe(404);
  });

  it("includes code and message in the response body", async () => {
    const err = new ApiError(400, "BAD_INPUT", "bad input");
    const res = apiErrorResponse(err);
    const payload = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe("BAD_INPUT");
    expect(payload.error.message).toBe("bad input");
  });
});

describe("handleApiError", () => {
  it("delegates to apiErrorResponse for ApiError instances", () => {
    const err = new ApiError(409, "CONFLICT", "conflict");
    const res = handleApiError(err);
    expect(res.status).toBe(409);
  });

  it("returns 500 INTERNAL for unexpected errors", async () => {
    const res = handleApiError(new Error("boom"));
    expect(res.status).toBe(500);
    const payload = (await res.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("INTERNAL");
  });

  it("returns 500 INTERNAL for non-Error thrown values", () => {
    const res = handleApiError("string error");
    expect(res.status).toBe(500);
  });
});
