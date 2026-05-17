import { GameState } from "../../core/types";
import {
  ServerMessage,
  sanitizeGameStateFor,
  serializeServerMessage,
} from "./protocol";

export interface HubSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readyState?: number;
}

interface Conn {
  socket: HubSocket;
  playerId: string;
}

const OPEN_STATE = 1; // matches the WebSocket OPEN constant

export class WebSocketHub {
  private readonly conns = new Map<string, Map<string, Conn>>();

  register(gameId: string, playerId: string, socket: HubSocket): void {
    let game = this.conns.get(gameId);
    if (!game) {
      game = new Map();
      this.conns.set(gameId, game);
    }
    const existing = game.get(playerId);
    if (existing) {
      existing.socket.close(4000, "Replaced by new connection.");
    }
    game.set(playerId, { socket, playerId });
  }

  unregister(gameId: string, playerId: string): void {
    const game = this.conns.get(gameId);
    if (!game) return;
    game.delete(playerId);
    if (game.size === 0) this.conns.delete(gameId);
  }

  sendTo(gameId: string, playerId: string, msg: ServerMessage): boolean {
    const conn = this.conns.get(gameId)?.get(playerId);
    if (!conn) return false;
    if (
      conn.socket.readyState !== undefined &&
      conn.socket.readyState !== OPEN_STATE
    ) {
      return false;
    }
    conn.socket.send(serializeServerMessage(msg));
    return true;
  }

  broadcast(
    gameId: string,
    factory: (playerId: string) => ServerMessage,
  ): void {
    const game = this.conns.get(gameId);
    if (!game) return;
    for (const [playerId, conn] of game.entries()) {
      if (
        conn.socket.readyState !== undefined &&
        conn.socket.readyState !== OPEN_STATE
      )
        continue;
      conn.socket.send(serializeServerMessage(factory(playerId)));
    }
  }

  broadcastState(gameId: string, state: GameState): void {
    this.broadcast(gameId, (viewerId) => ({
      type: "GAME_STATE_UPDATE",
      payload: { state: sanitizeGameStateFor(state, viewerId) },
    }));
  }

  isOnline(gameId: string, playerId: string): boolean {
    return this.conns.get(gameId)?.has(playerId) ?? false;
  }

  closeAll(): void {
    for (const game of this.conns.values()) {
      for (const conn of game.values()) {
        conn.socket.send(serializeServerMessage({ type: "SHUTDOWN_NOTICE" }));
        conn.socket.close(1001, "Server shutting down.");
      }
    }
    this.conns.clear();
  }

  get size(): number {
    let total = 0;
    for (const game of this.conns.values()) total += game.size;
    return total;
  }
}

const GLOBAL_KEY = Symbol.for("battleship.wsHub");

interface GlobalWithHub {
  [GLOBAL_KEY]?: WebSocketHub;
}

export function getHub(): WebSocketHub {
  const g = globalThis as unknown as GlobalWithHub;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new WebSocketHub();
  }
  return g[GLOBAL_KEY]!;
}

export function isHubInitialized(): boolean {
  const g = globalThis as unknown as GlobalWithHub;
  return g[GLOBAL_KEY] !== undefined;
}

export function __resetHubForTests(): void {
  const g = globalThis as unknown as GlobalWithHub;
  delete g[GLOBAL_KEY];
}
