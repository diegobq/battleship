type Listener = () => void;

export class LobbyEmitter {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    for (const fn of this.listeners) fn();
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }
}

const GLOBAL_KEY = Symbol.for("battleship.lobbyEmitter");

interface GlobalWithEmitter {
  [GLOBAL_KEY]?: LobbyEmitter;
}

export function getLobbyEmitter(): LobbyEmitter {
  const g = globalThis as unknown as GlobalWithEmitter;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new LobbyEmitter();
  }
  return g[GLOBAL_KEY]!;
}

export function __resetLobbyEmitterForTests(): void {
  const g = globalThis as unknown as GlobalWithEmitter;
  delete g[GLOBAL_KEY];
}
