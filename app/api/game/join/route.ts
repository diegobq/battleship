import { NextResponse } from 'next/server';
import { parseJoinGameRequest } from '@/lib/api/dto';
import { ApiError, handleApiError } from '@/lib/api/errors';
import { addSecondPlayer, createPlayer } from '@/lib/core/game';
import { newPlayerId, newShipId } from '@/lib/server/ids';
import { registry } from '@/lib/server/registry';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseJoinGameRequest(body);
    const game = registry.get(input.gameId);
    if (!game) {
      throw new ApiError(404, 'GAME_NOT_FOUND', `No game with id ${input.gameId}.`);
    }
    if (game.status !== 'lobby') {
      throw new ApiError(
        409,
        'GAME_NOT_JOINABLE',
        `Game ${input.gameId} is not in lobby (status=${game.status}).`,
      );
    }
    const playerId = newPlayerId();
    const joiner = createPlayer(playerId, input.playerName);
    const updated = addSecondPlayer(game, joiner, { idFactory: newShipId });
    registry.update(input.gameId, () => updated);
    return NextResponse.json({ gameId: game.id, playerId });
  } catch (err) {
    return handleApiError(err);
  }
}
