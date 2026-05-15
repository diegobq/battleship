import { NextResponse } from "next/server";
import { LobbyGameDto } from "@battleship/core";
import { registry } from "@battleship/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const games: LobbyGameDto[] = registry.listJoinable().map((g) => {
    const [hostId] = Object.keys(g.players);
    return {
      id: g.id,
      hostName: g.players[hostId].name,
      gameName: g.config.name,
      mode: g.config.mode,
      fleet: g.config.fleet,
      turnTimerMs: g.config.turnTimerMs,
      createdAt: g.createdAt,
    };
  });
  return NextResponse.json({ games });
}
