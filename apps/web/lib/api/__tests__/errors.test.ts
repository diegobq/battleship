import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@battleship/core";

type MockJsonResponse = {
  body: { error: { code: string; message: string } };
  status: number;
};

// Mock next/server at the boundary — it has side-effects when imported in Node.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

const { apiErrorResponse, handleApiError } = await import("../errors");

describe("apiErrorResponse", () => {
  it("returns the ApiError status code", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing");
    const res = apiErrorResponse(err) as unknown as MockJsonResponse;
    expect(res.status).toBe(404);
  });

  it("wraps code and message in an 'error' envelope", () => {
    const err = new ApiError(400, "BAD_REQUEST", "invalid input");
    const res = apiErrorResponse(err) as unknown as MockJsonResponse;
    expect(res.body).toEqual({
      error: { code: "BAD_REQUEST", message: "invalid input" },
    });
  });
});

describe("handleApiError", () => {
  it("delegates to apiErrorResponse for ApiError instances", () => {
    const err = new ApiError(409, "CONFLICT", "already joined");
    const res = handleApiError(err) as unknown as MockJsonResponse;
    expect(res.status).toBe(409);
  });

  it("returns 500 INTERNAL for unexpected errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError(
      new Error("boom"),
    ) as unknown as MockJsonResponse;
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL");
    errorSpy.mockRestore();
  });

  it("returns 500 INTERNAL for non-Error thrown values", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError("string error") as unknown as MockJsonResponse;
    expect(res.status).toBe(500);
    errorSpy.mockRestore();
  });
});
