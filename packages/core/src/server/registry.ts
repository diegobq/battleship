import { GameState } from "../core/types";

export interface GameRegistry {
  create(game: GameState): void;
  get(id: string): GameState | undefined;
  update(
    id: string,
    fn: (state: GameState) => GameState,
  ): GameState | undefined;
  list(): GameState[];
  listJoinable(): GameState[];
  delete(id: string): boolean;
}

class InMemoryGameRegistry implements GameRegistry {
  private readonly games = new Map<string, GameState>();

  create(game: GameState): void {
    if (this.games.has(game.id)) {
      throw new Error(`Game ${game.id} already exists.`);
    }
    this.games.set(game.id, game);
  }

  get(id: string): GameState | undefined {
    return this.games.get(id);
  }

  update(
    id: string,
    fn: (state: GameState) => GameState,
  ): GameState | undefined {
    const current = this.games.get(id);
    if (!current) return undefined;
    const next = fn(current);
    this.games.set(id, next);
    return next;
  }

  list(): GameState[] {
    return Array.from(this.games.values());
  }

  listJoinable(): GameState[] {
    return this.list().filter(
      (g) => g.status === "lobby" && Object.keys(g.players).length < 2,
    );
  }

  delete(id: string): boolean {
    return this.games.delete(id);
  }
}

const GLOBAL_KEY = Symbol.for("battleship.gameRegistry");

interface GlobalWithRegistry {
  [GLOBAL_KEY]?: GameRegistry;
}

export function getRegistry(): GameRegistry {
  const g = globalThis as unknown as GlobalWithRegistry;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new InMemoryGameRegistry();
  }
  return g[GLOBAL_KEY]!;
}

export function isRegistryInitialized(): boolean {
  const g = globalThis as unknown as GlobalWithRegistry;
  return g[GLOBAL_KEY] !== undefined;
}

// Test-only helper. Removing the pin forces the next getRegistry() call to construct
// a fresh instance — keeps individual test cases independent of each other.
export function __resetRegistryForTests(): void {
  const g = globalThis as unknown as GlobalWithRegistry;
  delete g[GLOBAL_KEY];
}

export const registry = getRegistry();
