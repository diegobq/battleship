import { NextResponse } from "next/server";
import { parseJoinGameRequest } from "@battleship/core";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { mintToken, getSessionSecret } from "@/lib/api/session-token";
import { addSecondPlayer, createPlayer } from "@battleship/core";
import { newPlayerId, newShipId } from "@battleship/core";
import { registry, getLobbyEmitter } from "@battleship/core";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const input = parseJoinGameRequest(body);
    const game = registry.get(input.gameId);
    if (!game) {
      throw new ApiError(
        404,
        "GAME_NOT_FOUND",
        `No game with id ${input.gameId}.`,
      );
    }
    if (game.status !== "lobby") {
      throw new ApiError(
        409,
        "GAME_NOT_JOINABLE",
        `Game ${input.gameId} is not in lobby (status=${game.status}).`,
      );
    }
    const playerId = newPlayerId();
    const joiner = createPlayer(playerId, input.playerName);
    const updated = addSecondPlayer(game, joiner, { idFactory: newShipId });
    registry.update(input.gameId, () => updated);
    getLobbyEmitter().notify();
    const token = mintToken(playerId, game.id, getSessionSecret());
    const res = NextResponse.json({ gameId: game.id, playerId });
    res.cookies.set(`battleship_session_${game.id}`, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
