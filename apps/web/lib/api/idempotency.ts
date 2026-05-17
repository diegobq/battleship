const TTL_MS = 5 * 60 * 1000;
const GLOBAL_KEY = Symbol.for("battleship.idempotencyCache");

export interface CachedGameResponse {
  gameId: string;
  playerId: string;
  cookieValue: string;
}

interface Entry {
  value: CachedGameResponse;
  expiresAt: number;
}

export class IdempotencyCache {
  private readonly store = new Map<string, Entry>();
  private readonly ttlMs: number;

  constructor(ttlMs = TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string, now = Date.now()): CachedGameResponse | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: CachedGameResponse, now = Date.now()): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}

interface GlobalWithCache {
  [GLOBAL_KEY]?: IdempotencyCache;
}

export function getIdempotencyCache(): IdempotencyCache {
  const g = globalThis as unknown as GlobalWithCache;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new IdempotencyCache();
  return g[GLOBAL_KEY]!;
}

export function __resetIdempotencyCacheForTests(): void {
  const g = globalThis as unknown as GlobalWithCache;
  delete g[GLOBAL_KEY];
}
