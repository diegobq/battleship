import { describe, it, expect, vi, afterEach } from "vitest";
import { TurnTimer } from "../turn-timer";

afterEach(() => {
  vi.useRealTimers();
});

describe("TurnTimer", () => {
  it("fires the callback after the specified delay", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    const cb = vi.fn();
    timer.start("g1", 1000, cb);
    vi.advanceTimersByTime(999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledOnce();
  });

  it("cancel prevents the callback from firing", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    const cb = vi.fn();
    timer.start("g1", 1000, cb);
    timer.cancel("g1");
    vi.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("cancel returns true when a timer existed, false otherwise", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    timer.start("g1", 500, () => {});
    expect(timer.cancel("g1")).toBe(true);
    expect(timer.cancel("g1")).toBe(false);
  });

  it("start replaces an existing timer for the same gameId", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    const first = vi.fn();
    const second = vi.fn();
    timer.start("g1", 1000, first);
    timer.start("g1", 500, second);
    vi.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("has() returns true while timer is active, false after cancel", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    timer.start("g1", 1000, () => {});
    expect(timer.has("g1")).toBe(true);
    timer.cancel("g1");
    expect(timer.has("g1")).toBe(false);
  });

  it("size reflects the number of active timers", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    timer.start("g1", 1000, () => {});
    timer.start("g2", 1000, () => {});
    expect(timer.size).toBe(2);
    timer.cancel("g1");
    expect(timer.size).toBe(1);
  });

  it("cancelAll removes all active timers", () => {
    vi.useFakeTimers();
    const timer = new TurnTimer();
    const cb = vi.fn();
    timer.start("g1", 500, cb);
    timer.start("g2", 500, cb);
    timer.cancelAll();
    vi.advanceTimersByTime(1000);
    expect(cb).not.toHaveBeenCalled();
    expect(timer.size).toBe(0);
  });
});
