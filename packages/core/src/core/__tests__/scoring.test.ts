import { describe, it, expect } from "vitest";
import {
  awardScore,
  calculateHitScore,
  calculateMissPenalty,
  calculateProbabilityOfHit,
  getConsecutiveHitMultiplier,
  resolveEliteConfig,
  DEFAULT_ELITE_CONFIG,
} from "../scoring";
import type { ShotScoreInput } from "../scoring";

function hit(overrides: Partial<ShotScoreInput> = {}): ShotScoreInput {
  return {
    mode: "Elite",
    hit: true,
    unHitShipCells: 3,
    hiddenCells: 30,
    previousConsecutiveHits: 0,
    timeTakenMs: 5000, // no reflex bonus by default
    ...overrides,
  };
}

function miss(overrides: Partial<ShotScoreInput> = {}): ShotScoreInput {
  return { ...hit({ hit: false }), ...overrides };
}

// ─── Classic ──────────────────────────────────────────────────────────────────

describe("Classic mode", () => {
  it("awards exactly 1 point per hit", () => {
    expect(awardScore(hit({ mode: "Classic" })).scoreAwarded).toBe(1);
  });

  it("awards 0 for a miss", () => {
    expect(awardScore(miss({ mode: "Classic" })).scoreAwarded).toBe(0);
  });

  it("increments consecutiveHits on a hit", () => {
    expect(awardScore(hit({ mode: "Classic", previousConsecutiveHits: 2 })).consecutiveHits).toBe(3);
  });

  it("resets consecutiveHits to 0 on a miss", () => {
    expect(awardScore(miss({ mode: "Classic", previousConsecutiveHits: 5 })).consecutiveHits).toBe(0);
  });
});

// ─── Risk ─────────────────────────────────────────────────────────────────────

describe("Risk mode", () => {
  it("awards 10 points per hit", () => {
    expect(awardScore(hit({ mode: "Risk" })).scoreAwarded).toBe(10);
  });

  it("applies −1 penalty on miss (floor is caller's responsibility)", () => {
    expect(awardScore(miss({ mode: "Risk" })).scoreAwarded).toBe(-1);
  });
});

// ─── Elite — base + accuracy bonus ───────────────────────────────────────────

describe("Elite mode — accuracy bonus", () => {
  it("awards only the base score when p(hit) === 1 (no hidden cells)", () => {
    // All remaining cells are ship cells → p=1 → accuracy bonus = 0
    const result = awardScore(hit({ unHitShipCells: 5, hiddenCells: 5 }));
    expect(result.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints);
  });

  it("awards full accuracy bonus when p(hit) approaches 0", () => {
    // 1 ship cell out of 10000 hidden → p≈0 → bonus ≈ accuracyBonusMax
    const result = awardScore(hit({ unHitShipCells: 1, hiddenCells: 10000 }));
    const maxPossible = DEFAULT_ELITE_CONFIG.basePoints + DEFAULT_ELITE_CONFIG.accuracyBonusMax;
    expect(result.scoreAwarded).toBeGreaterThan(maxPossible - 2);
  });

  it("accuracy bonus is proportional (midpoint gives roughly half)", () => {
    const halfBonusResult = awardScore(hit({ unHitShipCells: 5, hiddenCells: 10 }));
    // p=0.5 → bonus = accuracyBonusMax * 0.5 = 20 → score ≈ 30
    expect(halfBonusResult.scoreAwarded).toBeGreaterThan(25);
    expect(halfBonusResult.scoreAwarded).toBeLessThan(40);
  });
});

// ─── Elite — consecutive hit multiplier ──────────────────────────────────────

describe("Elite mode — consecutive multiplier", () => {
  it("uses multiplier[1] = 1 for the first hit (streak becomes 1)", () => {
    const base = awardScore(hit({ previousConsecutiveHits: 0, unHitShipCells: 5, hiddenCells: 5 }));
    // multiplier[1]=1 → same as no multiplier
    expect(base.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints);
  });

  it("applies 1.5× at streak=2", () => {
    const result = awardScore(hit({ previousConsecutiveHits: 1, unHitShipCells: 5, hiddenCells: 5 }));
    expect(result.scoreAwarded).toBe(Math.round(DEFAULT_ELITE_CONFIG.basePoints * 1.5));
  });

  it("applies 2× at streak=3", () => {
    const result = awardScore(hit({ previousConsecutiveHits: 2, unHitShipCells: 5, hiddenCells: 5 }));
    expect(result.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints * 2);
  });

  it("clamps to the last multiplier (3×) at streak ≥ 4", () => {
    const at4 = awardScore(hit({ previousConsecutiveHits: 3, unHitShipCells: 5, hiddenCells: 5 }));
    const at10 = awardScore(hit({ previousConsecutiveHits: 9, unHitShipCells: 5, hiddenCells: 5 }));
    expect(at4.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints * 3);
    expect(at10.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints * 3);
  });
});

// ─── Elite — reflex bonus ─────────────────────────────────────────────────────

describe("Elite mode — reflex bonus", () => {
  const cfg = { unHitShipCells: 5, hiddenCells: 5, previousConsecutiveHits: 0 };

  it("applies the reflex multiplier at exactly reflexWindowMs", () => {
    const within = awardScore(hit({ ...cfg, timeTakenMs: DEFAULT_ELITE_CONFIG.reflexWindowMs }));
    const base = awardScore(hit({ ...cfg, timeTakenMs: DEFAULT_ELITE_CONFIG.reflexWindowMs + 1 }));
    expect(within.scoreAwarded).toBeGreaterThan(base.scoreAwarded);
  });

  it("does not apply the reflex multiplier one ms after the window", () => {
    const just_outside = awardScore(hit({ ...cfg, timeTakenMs: DEFAULT_ELITE_CONFIG.reflexWindowMs + 1 }));
    expect(just_outside.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.basePoints);
  });

  it("applies reflex at 1 ms (well within window)", () => {
    const fast = awardScore(hit({ ...cfg, timeTakenMs: 1 }));
    expect(fast.scoreAwarded).toBe(
      Math.round(DEFAULT_ELITE_CONFIG.basePoints * DEFAULT_ELITE_CONFIG.reflexMultiplier),
    );
  });
});

// ─── Elite — miss penalty ─────────────────────────────────────────────────────

describe("Elite mode — miss penalty", () => {
  it("returns the configured missPenalty delta on a miss", () => {
    const result = awardScore(miss({ mode: "Elite" }));
    expect(result.scoreAwarded).toBe(DEFAULT_ELITE_CONFIG.missPenalty);
  });

  it("resets consecutiveHits to 0 on a miss", () => {
    const result = awardScore(miss({ mode: "Elite", previousConsecutiveHits: 3 }));
    expect(result.consecutiveHits).toBe(0);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe("calculateProbabilityOfHit", () => {
  it("returns 1 when hiddenCells is 0 or negative", () => {
    expect(calculateProbabilityOfHit(0, 0)).toBe(1);
    expect(calculateProbabilityOfHit(5, -1)).toBe(1);
  });

  it("is clamped to [0, 1]", () => {
    expect(calculateProbabilityOfHit(100, 5)).toBe(1);
    expect(calculateProbabilityOfHit(0, 10)).toBe(0);
  });
});

describe("getConsecutiveHitMultiplier", () => {
  it("returns 1 for an empty multipliers array", () => {
    expect(getConsecutiveHitMultiplier(5, [])).toBe(1);
  });

  it("clamps index to the last entry", () => {
    expect(getConsecutiveHitMultiplier(99, [1, 2, 3])).toBe(3);
  });

  it("clamps index below 0 to the first entry", () => {
    expect(getConsecutiveHitMultiplier(-1, [1, 2, 3])).toBe(1);
  });
});

describe("resolveEliteConfig", () => {
  it("returns DEFAULT_ELITE_CONFIG when called with no argument", () => {
    expect(resolveEliteConfig()).toBe(DEFAULT_ELITE_CONFIG);
  });

  it("merges partial overrides onto the default", () => {
    const cfg = resolveEliteConfig({ basePoints: 20 });
    expect(cfg.basePoints).toBe(20);
    expect(cfg.reflexWindowMs).toBe(DEFAULT_ELITE_CONFIG.reflexWindowMs);
  });
});

describe("calculateHitScore", () => {
  it("delegates to the correct strategy for Classic mode", () => {
    expect(calculateHitScore("Classic", 5, 40, 0, 1000)).toBe(1);
  });

  it("delegates to the correct strategy for Risk mode", () => {
    expect(calculateHitScore("Risk", 5, 40, 0, 1000)).toBe(10);
  });
});

describe("calculateMissPenalty", () => {
  it("returns 0 for Classic mode", () => {
    expect(calculateMissPenalty("Classic")).toBe(0);
  });

  it("returns -1 for Risk mode", () => {
    expect(calculateMissPenalty("Risk")).toBe(-1);
  });
});
