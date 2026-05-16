import { LobbyGameDto, getLobbyEmitter, registry } from "@battleship/core";

export const dynamic = "force-dynamic";

function buildSnapshot(): string {
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
  return `data: ${JSON.stringify({ games })}\n\n`;
}

export function GET(): Response {
  const emitter = getLobbyEmitter();
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(buildSnapshot()));
      unsubscribe = emitter.subscribe(() => {
        controller.enqueue(encoder.encode(buildSnapshot()));
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
