import { describe, expect, it } from 'vitest';
import { makeSeededRng, makeSystemRng } from '../rng';

describe('makeSystemRng', () => {
  it('produces values in the [0, 1) range', () => {
    const rng = makeSystemRng();
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('makeSeededRng', () => {
  it('produces values in the [0, 1) range', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makeSeededRng(42);
    const b = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = makeSeededRng(1);
    const b = makeSeededRng(2);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 10; i++) {
      seqA.push(a.next());
      seqB.push(b.next());
    }
    expect(seqA).not.toEqual(seqB);
  });

  it('does not loop trivially within 10000 draws', () => {
    const rng = makeSeededRng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      seen.add(rng.next());
    }
    expect(seen.size).toBeGreaterThan(9_900);
  });
});
