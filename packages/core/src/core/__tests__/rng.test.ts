import { describe, it, expect } from "vitest";
import { makeSeededRng, makeSystemRng } from "../rng";

describe("makeSystemRng", () => {
  it("produces values in [0, 1)", () => {
    const rng = makeSystemRng();
    for (let i = 0; i < 20; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("makeSeededRng", () => {
  it("produces values in [0, 1)", () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic: same seed yields same sequence", () => {
    const a = makeSeededRng(1);
    const b = makeSeededRng(1);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = makeSeededRng(1);
    const b = makeSeededRng(2);
    const aVals = Array.from({ length: 10 }, () => a.next());
    const bVals = Array.from({ length: 10 }, () => b.next());
    expect(aVals).not.toEqual(bVals);
  });

  it("does not produce all-zero output", () => {
    const rng = makeSeededRng(0);
    const values = Array.from({ length: 20 }, () => rng.next());
    expect(values.some((v) => v > 0)).toBe(true);
  });
});
