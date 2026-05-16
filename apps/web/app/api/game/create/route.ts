import { NextResponse } from "next/server";
import { parseCreateGameRequest, ApiError } from "@battleship/core";
import { handleApiError } from "@/lib/api/errors";
import { makeSystemClock } from "@battleship/core";
import { defaultFleetConfig } from "@battleship/core";
import { createGame, createPlayer } from "@battleship/core";
import { newGameId, newPlayerId } from "@battleship/core";
import { registry, getLobbyEmitter } from "@battleship/core";

const MAX_OPEN_LOBBIES = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseCreateGameRequest(body);
    if (registry.listJoinable().length >= MAX_OPEN_LOBBIES) {
      throw new ApiError(
        409,
        "LOBBY_FULL",
        `Cannot create game: the lobby is full (max ${MAX_OPEN_LOBBIES} open games).`,
      );
    }
    const playerId = newPlayerId();
    const host = createPlayer(playerId, input.playerName);
    const game = createGame({
      id: newGameId(),
      config: {
        mode: input.mode,
        fleet: input.fleet ?? defaultFleetConfig(),
        turnTimerMs: input.turnTimerMs ?? 60_000,
        name: input.gameName,
      },
      host,
      clock: makeSystemClock(),
    });
    registry.create(game);
    getLobbyEmitter().notify();
    return NextResponse.json({ gameId: game.id, playerId });
  } catch (err) {
    return handleApiError(err);
  }
}
