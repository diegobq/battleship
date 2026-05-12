import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';
import { parseCreateGameRequest, parseJoinGameRequest } from '../dto';

describe('parseCreateGameRequest', () => {
  it('parses a minimal valid payload', () => {
    const out = parseCreateGameRequest({ mode: 'Classic', playerName: 'Alice' });
    expect(out).toEqual({
      mode: 'Classic',
      playerName: 'Alice',
      fleet: undefined,
      turnTimerMs: undefined,
    });
  });

  it('accepts a full payload with fleet and turnTimerMs', () => {
    const out = parseCreateGameRequest({
      mode: 'Elite',
      playerName: 'Bob',
      fleet: { Cruiser: 2, Submarine: 1 },
      turnTimerMs: 30_000,
    });
    expect(out.fleet).toEqual({ Cruiser: 2, Submarine: 1 });
    expect(out.turnTimerMs).toBe(30_000);
  });

  it('rejects non-object body', () => {
    expect(() => parseCreateGameRequest(null)).toThrow(ApiError);
    expect(() => parseCreateGameRequest('a string')).toThrow(ApiError);
    expect(() => parseCreateGameRequest([])).toThrow(ApiError);
  });

  it('rejects missing playerName', () => {
    expect(() => parseCreateGameRequest({ mode: 'Classic' })).toThrow(/playerName/);
  });

  it('rejects empty playerName', () => {
    expect(() => parseCreateGameRequest({ mode: 'Classic', playerName: '   ' })).toThrow(/playerName/);
  });

  it('rejects overlong playerName', () => {
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'x'.repeat(33) }),
    ).toThrow(/at most 32/);
  });

  it('rejects unknown mode', () => {
    expect(() => parseCreateGameRequest({ mode: 'Hard', playerName: 'Bob' })).toThrow(/mode/);
  });

  it('rejects unknown ship types in fleet', () => {
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', fleet: { Aircraft: 1 } }),
    ).toThrow(/Unknown ship type/);
  });

  it('rejects fleet count outside 0..10 or non-integer', () => {
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', fleet: { Cruiser: 11 } }),
    ).toThrow(/0 and 10/);
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', fleet: { Cruiser: -1 } }),
    ).toThrow(/0 and 10/);
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', fleet: { Cruiser: 1.5 } }),
    ).toThrow(/0 and 10/);
  });

  it('rejects an all-zero fleet', () => {
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', fleet: { Cruiser: 0 } }),
    ).toThrow(/at least one ship/);
  });

  it('rejects turnTimerMs outside the allowed range', () => {
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', turnTimerMs: 1_000 }),
    ).toThrow(/between 5000 and 600000/);
    expect(() =>
      parseCreateGameRequest({ mode: 'Classic', playerName: 'Bob', turnTimerMs: 1_000_000 }),
    ).toThrow(/between 5000 and 600000/);
  });

  it('trims whitespace from playerName', () => {
    const out = parseCreateGameRequest({ mode: 'Classic', playerName: '  Carol  ' });
    expect(out.playerName).toBe('Carol');
  });
});

describe('parseJoinGameRequest', () => {
  it('parses a valid payload', () => {
    expect(parseJoinGameRequest({ gameId: 'abc12345', playerName: 'Bob' })).toEqual({
      gameId: 'abc12345',
      playerName: 'Bob',
    });
  });

  it('rejects missing fields', () => {
    expect(() => parseJoinGameRequest({ gameId: 'a' })).toThrow(/playerName/);
    expect(() => parseJoinGameRequest({ playerName: 'B' })).toThrow(/gameId/);
  });

  it('rejects non-object body', () => {
    expect(() => parseJoinGameRequest(undefined)).toThrow(ApiError);
  });

  it('preserves ApiError code and status', () => {
    try {
      parseJoinGameRequest({});
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).code).toBe('BAD_REQUEST');
    }
  });
});
