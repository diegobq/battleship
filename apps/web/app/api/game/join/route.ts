import { NextResponse } from "next/server";
import { parseJoinGameRequest } from "@battleship/core";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { mintToken, getSessionSecret } from "@/lib/api/session-token";
import { addSecondPlayer, createPlayer } from "@battleship/core";
import { newPlayerId, newShipId } from "@battleship/core";
import { registry, getLobbyEmitter } from "@battleship/core";
import { getIdempotencyCache } from "@/lib/api/idempotency";

function setSessionCookie(
  res: NextResponse,
  gameId: string,
  cookieValue: string,
): void {
  res.cookies.set(`battleship_session_${gameId}`, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const cached = getIdempotencyCache().get(idempotencyKey);
      if (cached) {
        const res = NextResponse.json(
          { gameId: cached.gameId, playerId: cached.playerId },
          { status: 200 },
        );
        setSessionCookie(res, cached.gameId, cached.cookieValue);
        return res;
      }
    }

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
    const cookieValue = mintToken(playerId, game.id, getSessionSecret());
    if (idempotencyKey) {
      getIdempotencyCache().set(idempotencyKey, {
        gameId: game.id,
        playerId,
        cookieValue,
      });
    }
    const res = NextResponse.json({ gameId: game.id, playerId });
    setSessionCookie(res, game.id, cookieValue);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
