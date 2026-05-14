'use client';
import { useSyncExternalStore } from 'react';

const STORAGE_PREFIX = 'battleship:player:';

export function setPlayerId(gameId: string, playerId: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_PREFIX + gameId, playerId);
}

export function getPlayerId(gameId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(STORAGE_PREFIX + gameId);
}

export function clearPlayerId(gameId: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_PREFIX + gameId);
}

// React-friendly read: empty during SSR, real value after hydration. Avoids the
// setState-in-effect anti-pattern that strict React 19 lint rules flag.
export function usePlayerId(gameId: string): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getPlayerId(gameId),
    () => null,
  );
}
