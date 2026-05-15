import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import React from "react";
import { GameProvider, useGame } from "../GameProvider";

// ─── MockWebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1;
  static last: MockWebSocket;

  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(_url: string) {
    MockWebSocket.last = this;
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  send(d: string) {
    this.sentMessages.push(d);
  }
  receive(d: string) {
    this.onmessage?.({ data: d });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider gameId="g1" playerId="p1">
      {children}
    </GameProvider>
  );
}

function socket(): MockWebSocket {
  return MockWebSocket.last;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GameProvider / useGame", () => {
  it("throws when useGame is used outside GameProvider", () => {
    expect(() => renderHook(() => useGame())).toThrow();
  });

  it("exposes gameId and playerId from props", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.gameId).toBe("g1");
    expect(result.current.playerId).toBe("p1");
  });

  it("starts with null game state", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.state).toBeNull();
  });

  it("updates state on GAME_STATE_UPDATE message", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    const fakeState = { id: "g1", status: "placement" };
    act(() => {
      socket().receive(
        JSON.stringify({
          type: "GAME_STATE_UPDATE",
          payload: { state: fakeState },
        }),
      );
    });
    expect(result.current.state).toMatchObject({
      id: "g1",
      status: "placement",
    });
  });

  it("captures SHOT_RESULT with a timestamp", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      socket().receive(
        JSON.stringify({
          type: "SHOT_RESULT",
          payload: {
            shooterId: "p1",
            r: 0,
            c: 0,
            hit: true,
            scoreAwarded: 10,
            cellStatus: "hit",
          },
        }),
      );
    });
    expect(result.current.lastShot?.hit).toBe(true);
    expect(typeof result.current.lastShot?.at).toBe("number");
  });

  it("sets turnExpiredPlayerId on TURN_TIMEOUT and clears it after 2 s", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      socket().receive(
        JSON.stringify({ type: "TURN_TIMEOUT", payload: { playerId: "p1" } }),
      );
    });
    expect(result.current.turnExpiredPlayerId).toBe("p1");
    act(() => {
      vi.advanceTimersByTime(2_001);
    });
    expect(result.current.turnExpiredPlayerId).toBeNull();
  });

  it("sets errorMessage on ERROR message and clears it via dismissError", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      socket().receive(
        JSON.stringify({ type: "ERROR", payload: { message: "bad" } }),
      );
    });
    expect(result.current.errorMessage).toBe("bad");
    act(() => {
      result.current.dismissError();
    });
    expect(result.current.errorMessage).toBeNull();
  });

  it("placeFleet() sends a PLACE_FLEET message when socket is open", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      result.current.placeFleet([
        { shipId: "s1", r: 0, c: 0, orientation: "horizontal" },
      ]);
    });
    expect(socket().sentMessages.length).toBe(1);
    const sent = JSON.parse(socket().sentMessages[0]);
    expect(sent.type).toBe("PLACE_FLEET");
  });

  it("shoot() sends a SHOOT message when socket is open", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      result.current.shoot(3, 4);
    });
    const sent = JSON.parse(socket().sentMessages[0]);
    expect(sent).toMatchObject({ type: "SHOOT", payload: { r: 3, c: 4 } });
  });

  it("leaveGame() sends a LEAVE_GAME message when socket is open", () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => {
      socket().open();
    });
    act(() => {
      result.current.leaveGame();
    });
    const sent = JSON.parse(socket().sentMessages[0]);
    expect(sent.type).toBe("LEAVE_GAME");
  });
});
