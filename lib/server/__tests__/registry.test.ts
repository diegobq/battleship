import { beforeEach, describe, expect, it } from 'vitest';
import { makeFakeClock } from '@/lib/core/clock';
import { createGame, createPlayer } from '@/lib/core/game';
import { GameState } from '@/lib/core/types';
import { __resetRegistryForTests, getRegistry } from '../registry';

function makeGame(id: string, status: GameState['status'] = 'lobby', playerIds: string[] = ['host']): GameState {
  const clock = makeFakeClock(0);
  const host = createPlayer(playerIds[0], 'Host');
  const base = createGame({
    id,
    config: { mode: 'Classic', fleet: { Submarine: 1 }, turnTimerMs: 60_000 },
    host,
    clock,
  });
  const players = playerIds.reduce<Record<string, ReturnType<typeof createPlayer>>>(
    (acc, pid, i) => {
      acc[pid] = i === 0 ? host : createPlayer(pid, pid);
      return acc;
    },
    {},
  );
  return { ...base, status, players };
}

beforeEach(() => {
  __resetRegistryForTests();
});

describe('GameRegistry — basic crud', () => {
  it('creates and retrieves a game', () => {
    const r = getRegistry();
    const game = makeGame('g1');
    r.create(game);
    expect(r.get('g1')).toEqual(game);
  });

  it('throws when creating a duplicate id', () => {
    const r = getRegistry();
    r.create(makeGame('g1'));
    expect(() => r.create(makeGame('g1'))).toThrow(/already exists/);
  });

  it('returns undefined for an unknown id', () => {
    expect(getRegistry().get('missing')).toBeUndefined();
  });

  it('deletes a game and reports the result', () => {
    const r = getRegistry();
    r.create(makeGame('g1'));
    expect(r.delete('g1')).toBe(true);
    expect(r.delete('g1')).toBe(false);
    expect(r.get('g1')).toBeUndefined();
  });
});

describe('GameRegistry — update', () => {
  it('applies an updater function and stores the result', () => {
    const r = getRegistry();
    r.create(makeGame('g1'));
    const out = r.update('g1', (s) => ({ ...s, status: 'placement' }));
    expect(out?.status).toBe('placement');
    expect(r.get('g1')?.status).toBe('placement');
  });

  it('returns undefined for an unknown id', () => {
    expect(getRegistry().update('missing', (s) => s)).toBeUndefined();
  });
});

describe('GameRegistry — listJoinable', () => {
  it('includes lobby games with one player', () => {
    const r = getRegistry();
    r.create(makeGame('joinable', 'lobby', ['a']));
    r.create(makeGame('placement', 'placement', ['a', 'b']));
    r.create(makeGame('finished', 'finished', ['a', 'b']));
    expect(r.listJoinable().map((g) => g.id)).toEqual(['joinable']);
  });

  it('excludes lobby games that already have two players (defensive)', () => {
    const r = getRegistry();
    r.create(makeGame('full', 'lobby', ['a', 'b']));
    expect(r.listJoinable()).toEqual([]);
  });
});

describe('GameRegistry — globalThis singleton', () => {
  it('pins the registry on globalThis under a shared symbol', () => {
    const r1 = getRegistry();
    const r2 = getRegistry();
    expect(r2).toBe(r1);
  });

  it('returns a new instance after the test-only reset', () => {
    const before = getRegistry();
    __resetRegistryForTests();
    const after = getRegistry();
    expect(after).not.toBe(before);
  });
});
