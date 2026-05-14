export type TurnTimeoutCallback = () => void;

/**
 * Per-game turn timer. Holds at most one active NodeJS.Timeout per gameId.
 * start() replaces any existing timer for that game; cancel() clears it.
 * The server calls cancel() on every accepted action and start() to begin the next turn.
 */
export class TurnTimer {
  private readonly handles = new Map<string, ReturnType<typeof setTimeout>>();

  start(gameId: string, ms: number, onElapsed: TurnTimeoutCallback): void {
    this.cancel(gameId);
    const handle = setTimeout(() => {
      this.handles.delete(gameId);
      onElapsed();
    }, ms);
    this.handles.set(gameId, handle);
  }

  cancel(gameId: string): boolean {
    const existing = this.handles.get(gameId);
    if (!existing) return false;
    clearTimeout(existing);
    this.handles.delete(gameId);
    return true;
  }

  cancelAll(): void {
    for (const handle of this.handles.values()) {
      clearTimeout(handle);
    }
    this.handles.clear();
  }

  has(gameId: string): boolean {
    return this.handles.has(gameId);
  }

  get size(): number {
    return this.handles.size;
  }
}
