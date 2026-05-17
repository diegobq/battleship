import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLobbyEmitter, __resetLobbyEmitterForTests } from "../lobby-emitter";

describe("LobbyEmitter", () => {
  beforeEach(() => __resetLobbyEmitterForTests());

  it("calls all subscribers on notify()", () => {
    const emitter = getLobbyEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.subscribe(a);
    emitter.subscribe(b);
    emitter.notify();
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("unsubscribing removes the listener", () => {
    const emitter = getLobbyEmitter();
    const fn = vi.fn();
    const unsub = emitter.subscribe(fn);
    unsub();
    emitter.notify();
    expect(fn).not.toHaveBeenCalled();
  });

  it("subscriberCount reflects the current listener set", () => {
    const emitter = getLobbyEmitter();
    const unsub = emitter.subscribe(() => {});
    expect(emitter.subscriberCount).toBe(1);
    unsub();
    expect(emitter.subscriberCount).toBe(0);
  });

  it("unsubscribing inside a notify callback is safe", () => {
    const emitter = getLobbyEmitter();
    const unsubRef: { current: () => void } = { current: () => {} };
    const fn = vi.fn(() => unsubRef.current());
    unsubRef.current = emitter.subscribe(fn);
    expect(() => emitter.notify()).not.toThrow();
    emitter.notify();
    // fn was called exactly once (the first notify unsubscribed it)
    expect(fn).toHaveBeenCalledOnce();
  });

  it("getLobbyEmitter returns the same singleton across calls", () => {
    expect(getLobbyEmitter()).toBe(getLobbyEmitter());
  });

  it("__resetLobbyEmitterForTests creates a fresh instance", () => {
    const first = getLobbyEmitter();
    __resetLobbyEmitterForTests();
    const second = getLobbyEmitter();
    expect(first).not.toBe(second);
  });
});
