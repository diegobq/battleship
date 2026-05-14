import { randomUUID } from 'node:crypto';

/**
 * Eight-character game id derived from a UUID v4. Compact enough to share verbally;
 * 4.3 × 10⁹ space is plenty for in-memory lobbies.
 */
export function newGameId(): string {
  return randomUUID().slice(0, 8);
}

export function newPlayerId(): string {
  return randomUUID();
}

export function newShipId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}
