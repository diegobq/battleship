import { describe, expect, it } from 'vitest';
import { makeFakeClock } from '../../core/clock';
import { createGame, createPlayer } from '../../core/game';
import { GameState } from '../../core/types';
import { parseClientMessage, sanitizeGameStateFor, serializeServerMessage } from '../ws/protocol';

describe('parseClientMessage', () => {
  it('parses a valid PING', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'PING' }))).toEqual({ type: 'PING' });
  });

  it('parses a valid LEAVE_GAME', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'LEAVE_GAME' }))).toEqual({ type: 'LEAVE_GAME' });
  });

  it('parses a valid SHOOT', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'SHOOT', payload: { r: 3, c: 4 } }))).toEqual({
      type: 'SHOOT',
      payload: { r: 3, c: 4 },
    });
  });

  it('parses a valid PLACE_FLEET', () => {
    const raw = JSON.stringify({
      type: 'PLACE_FLEET',
      payload: {
        placements: [{ shipId: 's1', r: 0, c: 0, orientation: 'horizontal' }],
      },
    });
    expect(parseClientMessage(raw)).toEqual({
      type: 'PLACE_FLEET',
      payload: { placements: [{ shipId: 's1', r: 0, c: 0, orientation: 'horizontal' }] },
    });
  });

  it('rejects malformed JSON', () => {
    expect(() => parseClientMessage('not json')).toThrow(/Malformed JSON/);
  });

  it('rejects messages without a type', () => {
    expect(() => parseClientMessage('{}')).toThrow(/type field/);
  });

  it('rejects unknown message types', () => {
    expect(() => parseClientMessage(JSON.stringify({ type: 'NUKE' }))).toThrow(/Unknown message type/);
  });

  it('rejects SHOOT with non-integer coordinates', () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: 'SHOOT', payload: { r: 1.5, c: 2 } })),
    ).toThrow(/integer/);
  });

  it('rejects SHOOT missing coordinates', () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: 'SHOOT', payload: { r: 1 } })),
    ).toThrow(/numeric/);
  });

  it('rejects PLACE_FLEET with non-array placements', () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: 'PLACE_FLEET', payload: { placements: 'oops' } })),
    ).toThrow(/placements/);
  });

  it('rejects PLACE_FLEET with invalid placement entries', () => {
    expect(() =>
      parseClientMessage(
        JSON.stringify({
          type: 'PLACE_FLEET',
          payload: { placements: [{ shipId: 's1', r: 0, c: 0, orientation: 'diagonal' }] },
        }),
      ),
    ).toThrow(/Invalid placement/);
  });
});

describe('serializeServerMessage', () => {
  it('serializes a PONG with no payload', () => {
    expect(serializeServerMessage({ type: 'PONG' })).toBe(JSON.stringify({ type: 'PONG' }));
  });

  it('serializes an ERROR with code and message', () => {
    const raw = serializeServerMessage({
      type: 'ERROR',
      payload: { code: 'X', message: 'oops' },
    });
    expect(JSON.parse(raw)).toEqual({ type: 'ERROR', payload: { code: 'X', message: 'oops' } });
  });
});

function makeStateWithShips(): GameState {
  const clock = makeFakeClock(0);
  const host = createPlayer('host', 'Host');
  const game = createGame({
    id: 'g1',
    config: { mode: 'Classic', fleet: { Submarine: 1 }, turnTimerMs: 60_000 },
    host,
    clock,
  });
  return {
    ...game,
    players: {
      ...game.players,
      host: {
        ...host,
        grid: host.grid.map((row, r) =>
          r === 0 ? (['ship', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'] as typeof row) : row,
        ),
        ships: [
          {
            id: 's1',
            type: 'Submarine',
            length: 1,
            hits: 0,
            positions: [{ r: 0, c: 0 }],
            placed: true,
          },
        ],
      },
    },
  };
}

describe('sanitizeGameStateFor', () => {
  it("redacts the opponent's ship cells to empty for the viewer", () => {
    const state = makeStateWithShips();
    const sanitized = sanitizeGameStateFor(state, 'joiner');
    expect(sanitized.players.host.grid[0][0]).toBe('empty');
  });

  it('preserves hit and miss cells (those are public info)', () => {
    const state = makeStateWithShips();
    state.players.host.grid[2][2] = 'miss';
    state.players.host.grid[3][3] = 'hit';
    const sanitized = sanitizeGameStateFor(state, 'joiner');
    expect(sanitized.players.host.grid[2][2]).toBe('miss');
    expect(sanitized.players.host.grid[3][3]).toBe('hit');
  });

  it('hides opponent ship positions until the ship is sunk', () => {
    const state = makeStateWithShips();
    const sanitized = sanitizeGameStateFor(state, 'joiner');
    expect(sanitized.players.host.ships[0].positions).toEqual([]);
  });

  it('reveals positions of sunk opponent ships', () => {
    const state = makeStateWithShips();
    state.players.host.ships[0].hits = 1; // sunk (length=1)
    const sanitized = sanitizeGameStateFor(state, 'joiner');
    expect(sanitized.players.host.ships[0].positions).toEqual([{ r: 0, c: 0 }]);
  });

  it("does not redact the viewer's own state", () => {
    const state = makeStateWithShips();
    const sanitized = sanitizeGameStateFor(state, 'host');
    expect(sanitized.players.host.grid[0][0]).toBe('ship');
    expect(sanitized.players.host.ships[0].positions).toEqual([{ r: 0, c: 0 }]);
  });
});
