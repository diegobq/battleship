import { NextResponse } from 'next/server';
import { parseCreateGameRequest } from '@/lib/api/dto';
import { handleApiError } from '@/lib/api/errors';
import { makeSystemClock } from '@/lib/core/clock';
import { defaultFleetConfig } from '@/lib/core/fleet';
import { createGame, createPlayer } from '@/lib/core/game';
import { newGameId, newPlayerId } from '@/lib/server/ids';
import { registry } from '@/lib/server/registry';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseCreateGameRequest(body);
    const playerId = newPlayerId();
    const host = createPlayer(playerId, input.playerName);
    const game = createGame({
      id: newGameId(),
      config: {
        mode: input.mode,
        fleet: input.fleet ?? defaultFleetConfig(),
        turnTimerMs: input.turnTimerMs ?? 60_000,
      },
      host,
      clock: makeSystemClock(),
    });
    registry.create(game);
    return NextResponse.json({ gameId: game.id, playerId });
  } catch (err) {
    return handleApiError(err);
  }
}
