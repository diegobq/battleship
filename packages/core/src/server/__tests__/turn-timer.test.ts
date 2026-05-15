import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnTimer } from "../turn-timer";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TurnTimer", () => {
  it("invokes the callback after the configured delay", () => {
    const timer = new TurnTimer();
    const cb = vi.fn();
    timer.start("g1", 5_000, cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4_999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("clears its own handle after firing", () => {
    const timer = new TurnTimer();
    timer.start("g1", 1_000, () => undefined);
    vi.advanceTimersByTime(1_000);
    expect(timer.has("g1")).toBe(false);
    expect(timer.size).toBe(0);
  });

  it("cancel() prevents the callback from firing", () => {
    const timer = new TurnTimer();
    const cb = vi.fn();
    timer.start("g1", 5_000, cb);
    expect(timer.cancel("g1")).toBe(true);
    vi.advanceTimersByTime(10_000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("cancel() on an unknown game id returns false", () => {
    expect(new TurnTimer().cancel("missing")).toBe(false);
  });

  it("start() on an existing game replaces the previous timer", () => {
    const timer = new TurnTimer();
    const first = vi.fn();
    const second = vi.fn();
    timer.start("g1", 5_000, first);
    timer.start("g1", 2_000, second);
    vi.advanceTimersByTime(2_000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("tracks independent timers per game id", () => {
    const timer = new TurnTimer();
    const a = vi.fn();
    const b = vi.fn();
    timer.start("a", 1_000, a);
    timer.start("b", 2_000, b);
    expect(timer.size).toBe(2);
    vi.advanceTimersByTime(1_000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(b).toHaveBeenCalledTimes(1);
    expect(timer.size).toBe(0);
  });

  it("cancelAll() clears every pending timer", () => {
    const timer = new TurnTimer();
    const a = vi.fn();
    const b = vi.fn();
    timer.start("a", 1_000, a);
    timer.start("b", 2_000, b);
    timer.cancelAll();
    expect(timer.size).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
