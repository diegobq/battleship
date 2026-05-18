import { describe, it, expect } from "vitest";
import {
  mintToken,
  verifyToken,
  extractTokenFromCookies,
} from "../session-token";

const SECRET = "test-secret-for-unit-tests";

describe("mintToken", () => {
  it("returns a 64-character hex string", () => {
    expect(mintToken("p1", "g1", SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs produce the same token", () => {
    expect(mintToken("p1", "g1", SECRET)).toBe(mintToken("p1", "g1", SECRET));
  });

  it("differs when playerId changes", () => {
    expect(mintToken("p1", "g1", SECRET)).not.toBe(
      mintToken("p2", "g1", SECRET),
    );
  });

  it("differs when gameId changes", () => {
    expect(mintToken("p1", "g1", SECRET)).not.toBe(
      mintToken("p1", "g2", SECRET),
    );
  });

  it("differs when secret changes", () => {
    expect(mintToken("p1", "g1", SECRET)).not.toBe(
      mintToken("p1", "g1", "other-secret"),
    );
  });
});

describe("verifyToken", () => {
  it("accepts a token minted with the same inputs", () => {
    const token = mintToken("p1", "g1", SECRET);
    expect(verifyToken(token, "p1", "g1", SECRET)).toBe(true);
  });

  it("rejects a token when playerId does not match", () => {
    const token = mintToken("p1", "g1", SECRET);
    expect(verifyToken(token, "p2", "g1", SECRET)).toBe(false);
  });

  it("rejects a token when gameId does not match", () => {
    const token = mintToken("p1", "g1", SECRET);
    expect(verifyToken(token, "p1", "g2", SECRET)).toBe(false);
  });

  it("rejects a token when secret does not match", () => {
    const token = mintToken("p1", "g1", SECRET);
    expect(verifyToken(token, "p1", "g1", "wrong-secret")).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(verifyToken("", "p1", "g1", SECRET)).toBe(false);
  });

  it("rejects a token of wrong length", () => {
    expect(verifyToken("abc123", "p1", "g1", SECRET)).toBe(false);
  });

  it("rejects a token with invalid hex characters of the right length", () => {
    const bad = "g".repeat(64);
    expect(verifyToken(bad, "p1", "g1", SECRET)).toBe(false);
  });
});

describe("extractTokenFromCookies", () => {
  it("extracts the token for the given gameId", () => {
    expect(
      extractTokenFromCookies("battleship_session_g1=tok123; other=val", "g1"),
    ).toBe("tok123");
  });

  it("returns undefined when the cookie is absent", () => {
    expect(extractTokenFromCookies("other=val", "g1")).toBeUndefined();
  });

  it("returns undefined for an undefined cookie header", () => {
    expect(extractTokenFromCookies(undefined, "g1")).toBeUndefined();
  });

  it("does not confuse cookies with overlapping names", () => {
    const header = "battleship_session_g1=tok1; battleship_session_g10=tok10";
    expect(extractTokenFromCookies(header, "g1")).toBe("tok1");
    expect(extractTokenFromCookies(header, "g10")).toBe("tok10");
  });

  it("URL-decodes the token value", () => {
    expect(
      extractTokenFromCookies("battleship_session_g1=tok%3D123", "g1"),
    ).toBe("tok=123");
  });
});
