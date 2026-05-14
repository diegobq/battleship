import { IncomingMessage, createServer } from 'node:http';
import { Socket } from 'node:net';
import { parse } from 'node:url';
import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';
import { makeSystemClock } from '@battleship/core';
import { makeSystemRng } from '@battleship/core';
import { registry } from '@battleship/core';
import { TurnTimer } from '@battleship/core';
import { handleClientMessage } from '@battleship/core';
import { getHub } from '@battleship/core';
import { parseClientMessage } from '@battleship/core';

const PORT = Number(process.env.PORT ?? 3000);
const HOSTNAME = process.env.HOSTNAME ?? 'localhost';
const WS_PATH = '/api/game/stream';
const dev = process.env.NODE_ENV !== 'production';

async function start(): Promise<void> {
  const app = next({ dev, hostname: HOSTNAME, port: PORT });
  await app.prepare();
  const nextHandler = app.getRequestHandler();

  const httpServer = createServer((req, res) => {
    nextHandler(req, res, parse(req.url ?? '/', true));
  });

  const wss = new WebSocketServer({ noServer: true });
  const hub = getHub();
  const turnTimer = new TurnTimer();
  const clock = makeSystemClock();
  const rng = makeSystemRng();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    onWsConnection(ws, req, { hub, turnTimer, clock, rng });
  });

  httpServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const pathname = parse(req.url ?? '/').pathname;
    if (pathname !== WS_PATH) return; // let Next.js HMR handle other upgrades
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  httpServer.listen(PORT, () => {
    console.log(`> Battleship server ready on http://${HOSTNAME}:${PORT}`);
  });
}

interface RuntimeDeps {
  hub: ReturnType<typeof getHub>;
  turnTimer: TurnTimer;
  clock: ReturnType<typeof makeSystemClock>;
  rng: ReturnType<typeof makeSystemRng>;
}

function onWsConnection(ws: WebSocket, req: IncomingMessage, deps: RuntimeDeps): void {
  const { gameId, playerId } = parseConnectionParams(req);
  if (!gameId || !playerId) {
    ws.close(4000, 'Missing gameId or playerId.');
    return;
  }
  const game = registry.get(gameId);
  if (!game || !game.players[playerId]) {
    ws.close(4001, 'Invalid game or player.');
    return;
  }

  deps.hub.register(gameId, playerId, ws);
  deps.hub.broadcastState(gameId, game);

  ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw.toString();
      const msg = parseClientMessage(text);
      handleClientMessage({ registry, ...deps }, { gameId, playerId }, msg);
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          payload: { code: 'BAD_MESSAGE', message: (err as Error).message },
        }),
      );
    }
  });

  ws.on('close', () => {
    deps.hub.unregister(gameId, playerId);
  });
}

function parseConnectionParams(req: IncomingMessage): { gameId?: string; playerId?: string } {
  const { query } = parse(req.url ?? '/', true);
  return {
    gameId: typeof query.gameId === 'string' ? query.gameId : undefined,
    playerId: typeof query.playerId === 'string' ? query.playerId : undefined,
  };
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
