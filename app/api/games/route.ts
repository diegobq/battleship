import { NextResponse } from 'next/server';
import { LobbyGameDto } from '@/lib/api/dto';
import { registry } from '@/lib/server/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const games: LobbyGameDto[] = registry.listJoinable().map((g) => {
    const [hostId] = Object.keys(g.players);
    return {
      id: g.id,
      hostName: g.players[hostId].name,
      mode: g.config.mode,
      fleet: g.config.fleet,
      turnTimerMs: g.config.turnTimerMs,
      createdAt: g.createdAt,
    };
  });
  return NextResponse.json({ games });
}
