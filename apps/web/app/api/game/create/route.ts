import { NextResponse } from "next/server";
import { parseCreateGameRequest, ApiError } from "@battleship/core";
import { handleApiError } from "@/lib/api/errors";
import { mintToken, getSessionSecret } from "@/lib/api/session-token";
import { makeSystemClock } from "@battleship/core";
import { defaultFleetConfig } from "@battleship/core";
import { createGame, createPlayer } from "@battleship/core";
import { newGameId, newPlayerId } from "@battleship/core";
import { registry, getLobbyEmitter } from "@battleship/core";
import { getIdempotencyCache } from "@/lib/api/idempotency";

const MAX_OPEN_LOBBIES = 5;

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
