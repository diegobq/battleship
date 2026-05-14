import { describe, expect, it } from 'vitest';
import { makeFakeClock } from '../clock';
import {
  DEFAULT_ELITE_CONFIG,
  awardScore,
  calculateHitScore,
  calculateMissPenalty,
  calculateProbabilityOfHit,
  getConsecutiveHitMultiplier,
  resolveEliteConfig,
} from '../scoring';
import { EliteConfig } from '../types';

describe('calculateProbabilityOfHit', () => {
  it('is ratio of unhit ship cells to hidden cells', () => {
    expect(calculateProbabilityOfHit(5, 50)).toBeCloseTo(0.1);
    expect(calculateProbabilityOfHit(1, 4)).toBeCloseTo(0.25);
  });

  it('clamps to 1 when no hidden cells remain', () => {
    expect(calculateProbabilityOfHit(0, 0)).toBe(1);
    expect(calculateProbabilityOfHit(5, 0)).toBe(1);
  });

  it('clamps to [0, 1]', () => {
    expect(calculateProbabilityOfHit(99, 50)).toBe(1);
    expect(calculateProbabilityOfHit(-1, 50)).toBe(0);
  });
});

describe('getConsecutiveHitMultiplier (default curve)', () => {
  it('is 1 for no streak or single hit', () => {
    expect(getConsecutiveHitMultiplier(0)).toBe(1);
    expect(getConsecutiveHitMultiplier(1)).toBe(1);
  });

  it('escalates 1.5 -> 2 -> 3 then clamps', () => {
    expect(getConsecutiveHitMultiplier(2)).toBe(1.5);
    expect(getConsecutiveHitMultiplier(3)).toBe(2);
    expect(getConsecutiveHitMultiplier(4)).toBe(3);
    expect(getConsecutiveHitMultiplier(99)).toBe(3);
  });

  it('uses an injected multiplier curve when provided', () => {
    const custom = [1, 2, 5, 10];
    expect(getConsecutiveHitMultiplier(0, custom)).toBe(1);
    expect(getConsecutiveHitMultiplier(2, custom)).toBe(5);
    expect(getConsecutiveHitMultiplier(99, custom)).toBe(10);
  });

  it('defaults to 1 when given an empty curve', () => {
    expect(getConsecutiveHitMultiplier(3, [])).toBe(1);
  });
});

describe('calculateHitScore — Classic mode', () => {
  it('always awards exactly 1 point per hit', () => {
    expect(calculateHitScore('Classic', 5, 50, 1, 0)).toBe(1);
    expect(calculateHitScore('Classic', 1, 1, 99, 5000)).toBe(1);
  });
});

describe('calculateHitScore — Risk mode', () => {
  it('always awards exactly 10 points per hit', () => {
    expect(calculateHitScore('Risk', 5, 50, 1, 0)).toBe(10);
    expect(calculateHitScore('Risk', 1, 1, 99, 5000)).toBe(10);
  });
});

describe('calculateHitScore — Elite mode', () => {
  it('rewards low-probability hits with a higher accuracy bonus', () => {
    // p = 5/50 = 0.1 → bonus = round(40 * 0.9) = 36, score = 46, no streak, no reflex
    expect(calculateHitScore('Elite', 5, 50, 1, 5000)).toBe(46);
  });

  it('awards no accuracy bonus when probability is 1', () => {
    // p = 1, bonus = 0, score = 10, streak ×2 = 20, reflex ×1.2 = 24
    expect(calculateHitScore('Elite', 1, 1, 3, 1000)).toBe(24);
  });

  it('applies the consecutive-hit multiplier curve', () => {
    expect(calculateHitScore('Elite', 1, 1, 1, 5000)).toBe(10);
    expect(calculateHitScore('Elite', 1, 1, 2, 5000)).toBe(15);
    expect(calculateHitScore('Elite', 1, 1, 3, 5000)).toBe(20);
    expect(calculateHitScore('Elite', 1, 1, 4, 5000)).toBe(30);
    expect(calculateHitScore('Elite', 1, 1, 99, 5000)).toBe(30);
  });
});

describe('reflex bonus boundary at 3000ms (driven by FakeClock)', () => {
  function elapsedFrom(start: number, now: number): number {
    return now - start;
  }

  it('applies the reflex multiplier at exactly 3000ms after turn start', () => {
    const clock = makeFakeClock(1000);
    const turnStart = clock.now();
    clock.advance(3000);
    const elapsed = elapsedFrom(turnStart, clock.now());
    // base 10 × no-streak 1 × reflex 1.2 = 12 (boundary inclusive)
    expect(calculateHitScore('Elite', 1, 1, 1, elapsed)).toBe(12);
  });

  it('does not apply the reflex multiplier just after 3000ms', () => {
    const clock = makeFakeClock(0);
    const turnStart = clock.now();
    clock.advance(3001);
    const elapsed = elapsedFrom(turnStart, clock.now());
    expect(calculateHitScore('Elite', 1, 1, 1, elapsed)).toBe(10);
  });
});

describe('calculateMissPenalty', () => {
  it('is zero in Classic mode', () => {
    expect(calculateMissPenalty('Classic')).toBe(0);
  });

  it('is -1 in Risk mode', () => {
    expect(calculateMissPenalty('Risk')).toBe(-1);
  });

  it('uses the Elite missPenalty from config', () => {
    expect(calculateMissPenalty('Elite')).toBe(DEFAULT_ELITE_CONFIG.missPenalty);
    expect(calculateMissPenalty('Elite', { missPenalty: -5 })).toBe(-5);
  });
});

describe('awardScore (orchestrator)', () => {
  it('on hit, increments the streak and awards positive points', () => {
    const result = awardScore({
      mode: 'Classic',
      hit: true,
      unHitShipCells: 1,
      hiddenCells: 1,
      previousConsecutiveHits: 0,
      timeTakenMs: 0,
    });
    expect(result).toEqual({ scoreAwarded: 1, consecutiveHits: 1 });
  });

  it('on miss, resets streak to 0 and applies the mode penalty', () => {
    const result = awardScore({
      mode: 'Risk',
      hit: false,
      unHitShipCells: 5,
      hiddenCells: 50,
      previousConsecutiveHits: 3,
      timeTakenMs: 1000,
    });
    expect(result).toEqual({ scoreAwarded: -1, consecutiveHits: 0 });
  });

  it('chains streaks across multiple hits', () => {
    let prev = 0;
    const seq: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { consecutiveHits } = awardScore({
        mode: 'Elite',
        hit: true,
        unHitShipCells: 1,
        hiddenCells: 1,
        previousConsecutiveHits: prev,
        timeTakenMs: 5000,
      });
      seq.push(consecutiveHits);
      prev = consecutiveHits;
    }
    expect(seq).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('resolveEliteConfig', () => {
  it('returns the default when no partial provided', () => {
    expect(resolveEliteConfig()).toEqual(DEFAULT_ELITE_CONFIG);
  });

  it('merges partial overrides with defaults', () => {
    const partial: Partial<EliteConfig> = { missPenalty: -10, reflexMultiplier: 2 };
    const resolved = resolveEliteConfig(partial);
    expect(resolved.missPenalty).toBe(-10);
    expect(resolved.reflexMultiplier).toBe(2);
    expect(resolved.basePoints).toBe(DEFAULT_ELITE_CONFIG.basePoints);
    expect(resolved.multipliers).toBe(DEFAULT_ELITE_CONFIG.multipliers);
  });

  it('honors an injected multipliers array', () => {
    const custom = [1, 5, 10];
    expect(resolveEliteConfig({ multipliers: custom }).multipliers).toBe(custom);
  });
});
