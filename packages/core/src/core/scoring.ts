import { EliteConfig, GameMode } from "./types";

export const DEFAULT_ELITE_CONFIG: EliteConfig = {
  basePoints: 10,
  accuracyBonusMax: 40,
  // Indexed by consecutiveHits; clamped to the last entry once the streak exceeds the array.
  multipliers: [1, 1, 1.5, 2, 3],
  reflexWindowMs: 3000,
  reflexMultiplier: 1.2,
  missPenalty: -2,
};

export interface ShotScoreInput {
  mode: GameMode;
  hit: boolean;
  unHitShipCells: number;
  hiddenCells: number;
  previousConsecutiveHits: number;
  timeTakenMs: number;
  eliteConfig?: Partial<EliteConfig>;
}

export interface ScoreUpdate {
  // Delta to add to the player's score. Floor-at-zero is enforced by the caller.
  scoreAwarded: number;
  // New streak length after this shot (0 on miss, prev+1 on hit).
  consecutiveHits: number;
}

// Extension point: implement this interface to add a new game mode.
export interface ScoringStrategy {
  calculateHitScore(
    unHitShipCells: number,
    hiddenCells: number,
    consecutiveHits: number,
    timeTakenMs: number,
  ): number;
  calculateMissPenalty(): number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function resolveEliteConfig(
  partial?: Partial<EliteConfig>,
): EliteConfig {
  if (!partial) return DEFAULT_ELITE_CONFIG;
  return {
    ...DEFAULT_ELITE_CONFIG,
    ...partial,
    multipliers: partial.multipliers ?? DEFAULT_ELITE_CONFIG.multipliers,
  };
}

export function getConsecutiveHitMultiplier(
  consecutiveHits: number,
  multipliers: readonly number[] = DEFAULT_ELITE_CONFIG.multipliers,
): number {
  if (multipliers.length === 0) return 1;
  const idx = Math.max(0, Math.min(consecutiveHits, multipliers.length - 1));
  return multipliers[idx];
}

export function calculateProbabilityOfHit(
  unHitShipCells: number,
  hiddenCells: number,
): number {
  if (hiddenCells <= 0) return 1;
  return Math.min(1, Math.max(0, unHitShipCells / hiddenCells));
}

// ─── Concrete strategies ──────────────────────────────────────────────────────

const classicStrategy: ScoringStrategy = {
  calculateHitScore: () => 1,
  calculateMissPenalty: () => 0,
};

const riskStrategy: ScoringStrategy = {
  calculateHitScore: () => 10,
  calculateMissPenalty: () => -1,
};

class EliteStrategy implements ScoringStrategy {
  constructor(private readonly cfg: EliteConfig) {}

  calculateHitScore(
    unHitShipCells: number,
    hiddenCells: number,
    consecutiveHits: number,
    timeTakenMs: number,
  ): number {
    const p = calculateProbabilityOfHit(unHitShipCells, hiddenCells);
    const accuracyBonus =
      p > 0 ? Math.round(this.cfg.accuracyBonusMax * (1 - p)) : 0;
    let score = this.cfg.basePoints + accuracyBonus;
    score *= getConsecutiveHitMultiplier(consecutiveHits, this.cfg.multipliers);
    if (timeTakenMs <= this.cfg.reflexWindowMs)
      score *= this.cfg.reflexMultiplier;
    return Math.round(score);
  }

  calculateMissPenalty(): number {
    return this.cfg.missPenalty;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
// Adding a new mode: add to GameMode union, create a strategy, add a case here.
// TypeScript exhaustiveness checking will fail the build if any mode is unhandled.

function resolveScoringStrategy(
  mode: GameMode,
  eliteConfig?: Partial<EliteConfig>,
): ScoringStrategy {
  switch (mode) {
    case "Classic":
      return classicStrategy;
    case "Risk":
      return riskStrategy;
    case "Elite":
      return new EliteStrategy(resolveEliteConfig(eliteConfig));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateHitScore(
  mode: GameMode,
  unHitShipCells: number,
  hiddenCells: number,
  consecutiveHits: number,
  timeTakenMs: number,
  eliteConfig?: Partial<EliteConfig>,
): number {
  return resolveScoringStrategy(mode, eliteConfig).calculateHitScore(
    unHitShipCells,
    hiddenCells,
    consecutiveHits,
    timeTakenMs,
  );
}

export function calculateMissPenalty(
  mode: GameMode,
  eliteConfig?: Partial<EliteConfig>,
): number {
  return resolveScoringStrategy(mode, eliteConfig).calculateMissPenalty();
}

export function awardScore(input: ShotScoreInput): ScoreUpdate {
  const strategy = resolveScoringStrategy(input.mode, input.eliteConfig);
  if (input.hit) {
    const consecutiveHits = input.previousConsecutiveHits + 1;
    return {
      scoreAwarded: strategy.calculateHitScore(
        input.unHitShipCells,
        input.hiddenCells,
        consecutiveHits,
        input.timeTakenMs,
      ),
      consecutiveHits,
    };
  }
  return { scoreAwarded: strategy.calculateMissPenalty(), consecutiveHits: 0 };
}
