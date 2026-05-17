import { IncomingMessage, createServer } from "node:http";
import { Socket } from "node:net";
import { parse } from "node:url";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";
import { makeSystemClock } from "@battleship/core";
import { makeSystemRng } from "@battleship/core";
import { registry } from "@battleship/core";
import { TurnTimer } from "@battleship/core";
import { handleClientMessage } from "@battleship/core";
import { getHub } from "@battleship/core";
import { parseClientMessage } from "@battleship/core";
import {
  verifyToken,
  getSessionSecret,
  extractTokenFromCookies,
} from "./lib/api/session-token";
import { createMessageRateLimiter } from "./lib/api/rate-limiter";
import { env } from "./lib/env";

const WS_PATH = "/api/game/stream";
const dev = env.NODE_ENV !== "production";
const DRAIN_MS = 10_000;

function isOriginAllowed(origin: string | undefined): boolean {
  const raw = env.ALLOWED_ORIGINS ?? "";
  if (dev && !raw) return true; // allow all in development when not explicitly configured
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin ?? "");
}

async function start(): Promise<void> {
  const sessionSecret = getSessionSecret();
  const app = next({ dev, hostname: env.HOSTNAME, port: env.PORT });
  await app.prepare();
  const nextHandler = app.getRequestHandler();

  const httpServer = createServer((req, res) => {
    nextHandler(req, res, parse(req.url ?? "/", true));
  });

  const wss = new WebSocketServer({ noServer: true });
  const hub = getHub();
  const turnTimer = new TurnTimer();
  const clock = makeSystemClock();
  const rng = makeSystemRng();
  let shuttingDown = false;

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    onWsConnection(ws, req, { hub, turnTimer, clock, rng }, sessionSecret);
  });

  httpServer.on(
    "upgrade",
    (req: IncomingMessage, socket: Socket, head: Buffer) => {
      const pathname = parse(req.url ?? "/").pathname;
      if (pathname !== WS_PATH) return; // let Next.js HMR handle other upgrades
      if (shuttingDown) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
        socket.destroy();
        return;
      }
      if (!isOriginAllowed(req.headers.origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) =>
        wss.emit("connection", ws, req),
      );
    },
  );

  httpServer.listen(env.PORT, () => {
    console.log(
      `> Battleship server ready on http://${env.HOSTNAME}:${env.PORT}`,
    );
  });

  registerShutdownHandlers(httpServer, hub, () => {
    shuttingDown = true;
  });
}

function registerShutdownHandlers(
  httpServer: ReturnType<typeof createServer>,
  hub: ReturnType<typeof getHub>,
  onShutdown: () => void,
): void {
  let shuttingDown = false;

  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    onShutdown();
    console.log("> Graceful shutdown initiated…");
    hub.closeAll();
    setTimeout(() => {
      httpServer.close(() => {
        console.log("> Server closed.");
        process.exit(0);
      });
    }, DRAIN_MS);
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

interface RuntimeDeps {
  hub: ReturnType<typeof getHub>;
  turnTimer: TurnTimer;
  clock: ReturnType<typeof makeSystemClock>;
  rng: ReturnType<typeof makeSystemRng>;
}

function onWsConnection(
  ws: WebSocket,
  req: IncomingMessage,
  deps: RuntimeDeps,
  sessionSecret: string,
): void {
  const { gameId, playerId } = parseConnectionParams(req);
  if (!gameId || !playerId) {
    ws.close(4000, "Missing gameId or playerId.");
    return;
  }
  const token = extractTokenFromCookies(req.headers.cookie, gameId);
  if (!token || !verifyToken(token, playerId, gameId, sessionSecret)) {
    ws.close(4003, "Invalid session token.");
    return;
  }
  const game = registry.get(gameId);
  if (!game || !game.players[playerId]) {
    ws.close(4001, "Invalid game or player.");
    return;
  }

  deps.hub.register(gameId, playerId, ws);
  deps.hub.broadcastState(gameId, game);

  const rateLimiter = createMessageRateLimiter(10, 1_000);

  ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
    if (!rateLimiter.check()) {
      ws.close(4029, "Rate limit exceeded.");
      return;
    }
    try {
      const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw.toString();
      const msg = parseClientMessage(text);
      handleClientMessage({ registry, ...deps }, { gameId, playerId }, msg);
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          payload: { code: "BAD_MESSAGE", message: (err as Error).message },
        }),
      );
    }
  });

  ws.on("close", () => {
    deps.hub.unregister(gameId, playerId);
  });
}

function parseConnectionParams(req: IncomingMessage): {
  gameId?: string;
  playerId?: string;
} {
  const { query } = parse(req.url ?? "/", true);
  return {
    gameId: typeof query.gameId === "string" ? query.gameId : undefined,
    playerId: typeof query.playerId === "string" ? query.playerId : undefined,
  };
}

start().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
