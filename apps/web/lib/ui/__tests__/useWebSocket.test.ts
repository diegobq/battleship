import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// ─── MockWebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = 0; // CONNECTING
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  open() { this.readyState = 1; this.onopen?.(); }
  error() { this.onerror?.(); }
  close() { this.readyState = 3; this.onclose?.(); }
  receive(data: string) { this.onmessage?.({ data }); }

  send(data: string) { this.sentMessages.push(data); }
}

function lastSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

// ─── Test Setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useWebSocket', () => {
  it('starts in "connecting" state when url is provided', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost/test' }));
    expect(result.current.state).toBe('connecting');
  });

  it('starts in "idle" state when url is null', () => {
    const { result } = renderHook(() => useWebSocket({ url: null }));
    expect(result.current.state).toBe('idle');
  });

  it('transitions to "open" when the socket connects', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost/test' }));
    act(() => { lastSocket().open(); });
    expect(result.current.state).toBe('open');
  });

  it('transitions to "error" on a socket error', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost/test' }));
    act(() => { lastSocket().error(); });
    expect(result.current.state).toBe('error');
  });

  it('transitions to "closed" when socket closes with no reconnects remaining', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost/test', maxReconnects: 0 }),
    );
    act(() => { lastSocket().close(); });
    expect(result.current.state).toBe('closed');
  });

  it('delivers incoming messages to the onMessage callback', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket({ url: 'ws://localhost/test', onMessage }));
    act(() => {
      lastSocket().open();
      lastSocket().receive(JSON.stringify({ type: 'PONG' }));
    });
    expect(onMessage).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }));
  });

  it('send() returns true and forwards data when socket is OPEN', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost/test' }));
    act(() => { lastSocket().open(); });
    let sent: boolean;
    act(() => { sent = result.current.send('hello'); });
    expect(sent!).toBe(true);
    expect(lastSocket().sentMessages).toContain('hello');
  });

  it('send() returns false when socket is not OPEN', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost/test' }));
    // socket not yet open (readyState = 0)
    let sent: boolean;
    act(() => { sent = result.current.send('hello'); });
    expect(sent!).toBe(false);
  });

  it('reconnects after close when attempts remain', () => {
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost/test', maxReconnects: 3, baseBackoffMs: 1_000 }),
    );
    const firstSocket = lastSocket();
    act(() => { firstSocket.close(); });
    act(() => { vi.advanceTimersByTime(1_001); });
    const secondSocket = lastSocket();
    expect(secondSocket).not.toBe(firstSocket);
  });
});
