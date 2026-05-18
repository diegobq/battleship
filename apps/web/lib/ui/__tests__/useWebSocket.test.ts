import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../useWebSocket";

// Minimal WebSocket stub that captures event handlers and lets tests drive state.
class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }
  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }
  simulateError() {
    this.onerror?.();
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function lastSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe("useWebSocket", () => {
  it("starts in 'connecting' state when a url is provided", () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));
    expect(result.current.state).toBe("connecting");
  });

  it("starts in 'idle' state when url is null", () => {
    const { result } = renderHook(() => useWebSocket({ url: null }));
    expect(result.current.state).toBe("idle");
  });

  it("transitions to 'open' when the socket opens", () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));
    act(() => lastSocket().simulateOpen());
    expect(result.current.state).toBe("open");
  });

  it("transitions to 'closed' when the socket closes", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useWebSocket({ url: "ws://test", maxReconnects: 0 }),
    );
    act(() => lastSocket().simulateOpen());
    act(() => lastSocket().simulateClose());
    expect(result.current.state).toBe("closed");
  });

  it("transitions to 'error' on a socket error", () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));
    act(() => lastSocket().simulateError());
    expect(result.current.state).toBe("error");
  });

  it("delivers messages to the onMessage callback", () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket({ url: "ws://test", onMessage }));
    act(() => {
      lastSocket().simulateOpen();
      lastSocket().simulateMessage(JSON.stringify({ type: "PONG" }));
    });
    expect(onMessage).toHaveBeenCalledWith(JSON.stringify({ type: "PONG" }));
  });

  it("send() returns true and forwards data when the socket is OPEN", () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));
    act(() => lastSocket().simulateOpen());
    const ok = result.current.send("hello");
    expect(ok).toBe(true);
    expect(lastSocket().send).toHaveBeenCalledWith("hello");
  });

  it("send() returns false when the socket is not open", () => {
    const { result } = renderHook(() => useWebSocket({ url: "ws://test" }));
    // socket still connecting (readyState = 0)
    const sent = result.current.send("hello");
    expect(sent).toBe(false);
  });

  it("reconnects after close when maxReconnects > 0", () => {
    vi.useFakeTimers();
    renderHook(() =>
      useWebSocket({ url: "ws://test", maxReconnects: 2, baseBackoffMs: 100 }),
    );
    act(() => {
      lastSocket().simulateOpen();
      lastSocket().simulateClose();
    });
    const beforeReconnect = MockWebSocket.instances.length;
    act(() => vi.advanceTimersByTime(200));
    expect(MockWebSocket.instances.length).toBeGreaterThan(beforeReconnect);
  });
});
