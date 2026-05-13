'use client';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ShipPlacement } from '@/lib/core/game';
import { GameState, ShipType } from '@/lib/core/types';
import { useWebSocket } from './useWebSocket';

export interface ShotEvent {
  shooterId: string;
  r: number;
  c: number;
  hit: boolean;
  sunkShipType?: ShipType;
  scoreAwarded: number;
  cellStatus: 'hit' | 'miss';
  at: number;
}

export interface GameContextValue {
  state: GameState | null;
  gameId: string;
  playerId: string;
  connection: 'connecting' | 'open' | 'closed' | 'error';
  lastShot: ShotEvent | null;
  turnExpiredPlayerId: string | null;
  errorMessage: string | null;
  placeFleet: (placements: ShipPlacement[]) => boolean;
  shoot: (r: number, c: number) => boolean;
  dismissError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  gameId,
  playerId,
  children,
}: {
  gameId: string;
  playerId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const [lastShot, setLastShot] = useState<ShotEvent | null>(null);
  const [turnExpiredPlayerId, setTurnExpiredPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const url = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/game/stream?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}`;
  }, [gameId, playerId]);

  const handleMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'GAME_STATE_UPDATE':
          setState(msg.payload.state);
          break;
        case 'SHOT_RESULT':
          setLastShot({ ...msg.payload, at: Date.now() });
          break;
        case 'TURN_TIMEOUT':
          setTurnExpiredPlayerId(msg.payload.playerId);
          break;
        case 'ERROR':
          setErrorMessage(msg.payload.message);
          break;
      }
    } catch (e) {
      console.error('Failed to handle WS message:', e);
    }
  }, []);

  const { state: wsState, send } = useWebSocket({ url, onMessage: handleMessage });

  useEffect(() => {
    if (!turnExpiredPlayerId) return;
    const t = setTimeout(() => setTurnExpiredPlayerId(null), 2_000);
    return () => clearTimeout(t);
  }, [turnExpiredPlayerId]);

  const placeFleet = useCallback(
    (placements: ShipPlacement[]) =>
      send(JSON.stringify({ type: 'PLACE_FLEET', payload: { placements } })),
    [send],
  );

  const shoot = useCallback(
    (r: number, c: number) => send(JSON.stringify({ type: 'SHOOT', payload: { r, c } })),
    [send],
  );

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      gameId,
      playerId,
      connection: simplifyWsState(wsState),
      lastShot,
      turnExpiredPlayerId,
      errorMessage,
      placeFleet,
      shoot,
      dismissError,
    }),
    [state, gameId, playerId, wsState, lastShot, turnExpiredPlayerId, errorMessage, placeFleet, shoot, dismissError],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function simplifyWsState(s: string): 'connecting' | 'open' | 'closed' | 'error' {
  if (s === 'open') return 'open';
  if (s === 'connecting') return 'connecting';
  if (s === 'error') return 'error';
  return 'closed';
}

export function useGame(): GameContextValue {
  const v = useContext(GameContext);
  if (!v) throw new Error('useGame() must be used inside <GameProvider>');
  return v;
}
