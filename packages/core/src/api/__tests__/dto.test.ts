import { describe, it, expect } from "vitest";
import { parseCreateGameRequest, parseJoinGameRequest } from "../dto";
import { ApiError } from "../api-error";

// ─── parseCreateGameRequest ───────────────────────────────────────────────────

describe("parseCreateGameRequest", () => {
  const valid = { mode: "Classic", playerName: "Alice" };

  it("accepts a minimal valid payload", () => {
    const req = parseCreateGameRequest(valid);
    expect(req.mode).toBe("Classic");
    expect(req.playerName).toBe("Alice");
  });

  it("trims whitespace from playerName", () => {
    const req = parseCreateGameRequest({ ...valid, playerName: "  Bob  " });
    expect(req.playerName).toBe("Bob");
  });

  it("throws 400 when body is not an object", () => {
    expect(() => parseCreateGameRequest("bad")).toThrow(ApiError);
    expect(() => parseCreateGameRequest(null)).toThrow(ApiError);
    expect(() => parseCreateGameRequest([])).toThrow(ApiError);
  });

  it("throws 400 when playerName is missing", () => {
    expect(() => parseCreateGameRequest({ mode: "Classic" })).toThrow(ApiError);
  });

  it("throws 400 when playerName is empty string", () => {
    expect(() =>
      parseCreateGameRequest({ mode: "Classic", playerName: "  " }),
    ).toThrow(ApiError);
  });

  it("throws 400 when playerName exceeds 32 characters", () => {
    const long = "A".repeat(33);
    expect(() =>
      parseCreateGameRequest({ mode: "Classic", playerName: long }),
    ).toThrow(ApiError);
  });

  it("throws 400 for an unknown mode", () => {
    expect(() =>
      parseCreateGameRequest({ mode: "DeathMatch", playerName: "Alice" }),
    ).toThrow(ApiError);
  });

  it("accepts all three valid modes", () => {
    for (const mode of ["Classic", "Risk", "Elite"]) {
      expect(() =>
        parseCreateGameRequest({ mode, playerName: "Alice" }),
      ).not.toThrow();
    }
  });

  it("NFKC-normalises full-width characters in playerName", () => {
    // Full-width Latin 'Ａｌｉｃｅ' normalises to ASCII 'Alice'
    const req = parseCreateGameRequest({
      mode: "Classic",
      playerName: "Ａｌｉｃｅ",
    });
    expect(req.playerName).toBe("Alice");
  });

  it("strips zero-width space from playerName", () => {
    // U+200B (zero-width space) is invisible and must be removed
    const req = parseCreateGameRequest({
      mode: "Classic",
      playerName: "Ali​ce",
    });
    expect(req.playerName).toBe("Alice");
  });

  it("strips RTL-override codepoints from playerName", () => {
    // U+202E (right-to-left override) can visually reverse a name
    const req = parseCreateGameRequest({
      mode: "Classic",
      playerName: "Ali‮ce",
    });
    expect(req.playerName).toBe("Alice");
  });

  it("throws 400 when playerName is non-empty but becomes empty after sanitisation", () => {
    // A name composed entirely of zero-width characters must be rejected
    expect(() =>
      parseCreateGameRequest({
        mode: "Classic",
        playerName: "​‌‍",
      }),
    ).toThrow(ApiError);
  });

  it("enforces max length against the sanitised string, not the raw input", () => {
    // 32 full-width chars normalise to 32 ASCII chars — exactly at the limit
    const exactly32 = "Ａ".repeat(32);
    expect(() =>
      parseCreateGameRequest({ mode: "Classic", playerName: exactly32 }),
    ).not.toThrow();

    // 33 full-width chars normalise to 33 ASCII chars — one over the limit
    const over32 = "Ａ".repeat(33);
    expect(() =>
      parseCreateGameRequest({ mode: "Classic", playerName: over32 }),
    ).toThrow(ApiError);
  });

  it("accepts an optional gameName", () => {
    const req = parseCreateGameRequest({ ...valid, gameName: "My Game" });
    expect(req.gameName).toBe("My Game");
  });

  it("ignores null gameName", () => {
    const req = parseCreateGameRequest({ ...valid, gameName: null });
    expect(req.gameName).toBeUndefined();
  });

  it("throws 400 when gameName exceeds 64 characters", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, gameName: "G".repeat(65) }),
    ).toThrow(ApiError);
  });

  it("accepts a valid fleet override", () => {
    const req = parseCreateGameRequest({ ...valid, fleet: { Submarine: 2 } });
    expect(req.fleet).toEqual({ Submarine: 2 });
  });

  it("throws 400 for an unknown ship type in fleet", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, fleet: { Battleship: 1 } }),
    ).toThrow(ApiError);
  });

  it("throws 400 for a non-integer fleet count", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, fleet: { Submarine: 1.5 } }),
    ).toThrow(ApiError);
  });

  it("throws 400 for a fleet count exceeding 10", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, fleet: { Submarine: 11 } }),
    ).toThrow(ApiError);
  });

  it("throws 400 when fleet totals zero ships", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, fleet: { Submarine: 0 } }),
    ).toThrow(ApiError);
  });

  it("accepts a valid turnTimerMs", () => {
    const req = parseCreateGameRequest({ ...valid, turnTimerMs: 30_000 });
    expect(req.turnTimerMs).toBe(30_000);
  });

  it("throws 400 when turnTimerMs is below the minimum (5000)", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, turnTimerMs: 4_999 }),
    ).toThrow(ApiError);
  });

  it("throws 400 when turnTimerMs is above the maximum (600000)", () => {
    expect(() =>
      parseCreateGameRequest({ ...valid, turnTimerMs: 600_001 }),
    ).toThrow(ApiError);
  });
});

// ─── parseJoinGameRequest ─────────────────────────────────────────────────────

describe("parseJoinGameRequest", () => {
  const valid = { gameId: "game-abc", playerName: "Bob" };

  it("accepts a valid join request", () => {
    const req = parseJoinGameRequest(valid);
    expect(req.gameId).toBe("game-abc");
    expect(req.playerName).toBe("Bob");
  });

  it("throws 400 when body is not an object", () => {
    expect(() => parseJoinGameRequest(42)).toThrow(ApiError);
  });

  it("throws 400 when gameId is missing", () => {
    expect(() => parseJoinGameRequest({ playerName: "Bob" })).toThrow(ApiError);
  });

  it("throws 400 when playerName is empty", () => {
    expect(() =>
      parseJoinGameRequest({ gameId: "g1", playerName: "" }),
    ).toThrow(ApiError);
  });
});

// ─── ApiError ─────────────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("stores status, code, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing resource");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("missing resource");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    expect(new ApiError(500, "INTERNAL", "oops")).toBeInstanceOf(Error);
  });
});
