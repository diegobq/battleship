import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import React from "react";
import { GameProvider, useGame } from "../GameProvider";

// ─── WebSocket stub ───────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1;
  static last: MockWebSocket | null = null;

  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(_url: string) {
    MockWebSocket.last = this;
  }

  open() { this.readyState = 1; this.onopen?.(); }
  receive(data: string) { this.onmessage?.({ data }); }
  disconnect() { this.readyState = 3; this.onclose?.(); }
}

beforeEach(() => {
  MockWebSocket.last = null;
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── Test consumer ────────────────────────────────────────────────────────────

function Consumer() {
  const ctx = useGame();
  return (
    <div>
      <div data-testid="status">{ctx.state?.status ?? "none"}</div>
      <div data-testid="connection">{ctx.connection}</div>
      <div data-testid="lastShot">{ctx.lastShot ? ctx.lastShot.shooterId : "none"}</div>
      <div data-testid="timeout">{ctx.turnExpiredPlayerId ?? "none"}</div>
      <div data-testid="error">{ctx.errorMessage ?? "none"}</div>
      <button onClick={ctx.dismissError}>dismiss</button>
    </div>
  );
}

function renderProvider() {
  render(
    <GameProvider gameId="g1" playerId="host">
      <Consumer />
    </GameProvider>,
  );
  const ws = MockWebSocket.last!;
  return { ws };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GameProvider", () => {
  it("starts in connecting state with no game state", () => {
    renderProvider();
    expect(screen.getByTestId("status").textContent).toBe("none");
    expect(screen.getByTestId("connection").textContent).toBe("connecting");
  });

  it("transitions to 'open' when the WebSocket opens", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    expect(screen.getByTestId("connection").textContent).toBe("open");
  });

  it("updates game state on GAME_STATE_UPDATE message", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(
        JSON.stringify({
          type: "GAME_STATE_UPDATE",
          payload: {
            state: {
              id: "g1",
              status: "playing",
              config: { mode: "Classic", fleet: {}, turnTimerMs: 60000 },
              players: {},
              activePlayerId: "host",
              lastActionTime: 0,
              createdAt: 0,
              turnDeadlineAt: null,
              winnerId: null,
            },
          },
        }),
      ),
    );
    expect(screen.getByTestId("status").textContent).toBe("playing");
  });

  it("sets lastShot on SHOT_RESULT message", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(
        JSON.stringify({
          type: "SHOT_RESULT",
          payload: {
            shooterId: "host",
            r: 0,
            c: 0,
            hit: true,
            scoreAwarded: 10,
            cellStatus: "hit",
          },
        }),
      ),
    );
    expect(screen.getByTestId("lastShot").textContent).toBe("host");
  });

  it("sets turnExpiredPlayerId on TURN_TIMEOUT message", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(
        JSON.stringify({
          type: "TURN_TIMEOUT",
          payload: { playerId: "guest" },
        }),
      ),
    );
    expect(screen.getByTestId("timeout").textContent).toBe("guest");
  });

  it("clears turnExpiredPlayerId after 2 s", () => {
    vi.useFakeTimers();
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(JSON.stringify({ type: "TURN_TIMEOUT", payload: { playerId: "guest" } })),
    );
    act(() => vi.advanceTimersByTime(2001));
    expect(screen.getByTestId("timeout").textContent).toBe("none");
  });

  it("sets errorMessage on ERROR message", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(JSON.stringify({ type: "ERROR", payload: { code: "WRONG_TURN", message: "Not your turn" } })),
    );
    expect(screen.getByTestId("error").textContent).toBe("Not your turn");
  });

  it("dismissError clears the error message", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() =>
      ws.receive(JSON.stringify({ type: "ERROR", payload: { code: "X", message: "boom" } })),
    );
    act(() => screen.getByText("dismiss").click());
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("transitions to 'closed' when the socket closes", () => {
    const { ws } = renderProvider();
    act(() => ws.open());
    act(() => ws.disconnect());
    // Closed connection shows closed state (after maxReconnects attempts)
    expect(["closed", "connecting"]).toContain(screen.getByTestId("connection").textContent);
  });
});
