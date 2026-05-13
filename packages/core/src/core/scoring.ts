import { EliteConfig, GameMode } from './types';

export const DEFAULT_ELITE_CONFIG: EliteConfig = {
  basePoints: 10,
  accuracyBonusMax: 40,
  // Indexed by consecutiveHits; clamped to the last entry once the streak exceeds the array.
  multipliers: [1, 1, 1.5, 2, 3],
  reflexWindowMs: 3000,
  reflexMultiplier: 1.2,
  missPenalty: -2,
};

const CLASSIC_HIT_POINTS = 1;
const RISK_HIT_POINTS = 10;
const RISK_MISS_PENALTY = -1;

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

export function resolveEliteConfig(partial?: Partial<EliteConfig>): EliteConfig {
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

export function calculateProbabilityOfHit(unHitShipCells: number, hiddenCells: number): number {
  if (hiddenCells <= 0) return 1;
  return Math.min(1, Math.max(0, unHitShipCells / hiddenCells));
}

export function calculateHitScore(
  mode: GameMode,
  unHitShipCells: number,
  hiddenCells: number,
  consecutiveHits: number,
  timeTakenMs: number,
  eliteConfig?: Partial<EliteConfig>,
): number {
  if (mode === 'Classic') return CLASSIC_HIT_POINTS;
  if (mode === 'Risk') return RISK_HIT_POINTS;
  return calculateEliteHitScore(
    unHitShipCells,
    hiddenCells,
    consecutiveHits,
    timeTakenMs,
    resolveEliteConfig(eliteConfig),
  );
}

function calculateEliteHitScore(
  unHitShipCells: number,
  hiddenCells: number,
  consecutiveHits: number,
  timeTakenMs: number,
  cfg: EliteConfig,
): number {
  const p = calculateProbabilityOfHit(unHitShipCells, hiddenCells);
  const accuracyBonus = p > 0 ? Math.round(cfg.accuracyBonusMax * (1 - p)) : 0;
  let score = cfg.basePoints + accuracyBonus;
  score *= getConsecutiveHitMultiplier(consecutiveHits, cfg.multipliers);
  if (timeTakenMs <= cfg.reflexWindowMs) {
    score *= cfg.reflexMultiplier;
  }
  return Math.round(score);
}

export function calculateMissPenalty(mode: GameMode, eliteConfig?: Partial<EliteConfig>): number {
  if (mode === 'Classic') return 0;
  if (mode === 'Risk') return RISK_MISS_PENALTY;
  return resolveEliteConfig(eliteConfig).missPenalty;
}

export function awardScore(input: ShotScoreInput): ScoreUpdate {
  if (input.hit) {
    const consecutiveHits = input.previousConsecutiveHits + 1;
    const scoreAwarded = calculateHitScore(
      input.mode,
      input.unHitShipCells,
      input.hiddenCells,
      consecutiveHits,
      input.timeTakenMs,
      input.eliteConfig,
    );
    return { scoreAwarded, consecutiveHits };
  }
  return {
    scoreAwarded: calculateMissPenalty(input.mode, input.eliteConfig),
    consecutiveHits: 0,
  };
}
