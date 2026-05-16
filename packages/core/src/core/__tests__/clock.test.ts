import { describe, it, expect } from "vitest";
import { makeFakeClock, makeSystemClock } from "../clock";

describe("makeSystemClock", () => {
  it("returns a value close to Date.now()", () => {
    const clock = makeSystemClock();
    const before = Date.now();
    const t = clock.now();
    const after = Date.now();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});

describe("makeFakeClock", () => {
  it("starts at zero by default", () => {
    const clock = makeFakeClock();
    expect(clock.now()).toBe(0);
  });

  it("starts at the given seed", () => {
    const clock = makeFakeClock(1000);
    expect(clock.now()).toBe(1000);
  });

  it("advance adds elapsed time", () => {
    const clock = makeFakeClock(0);
    clock.advance(500);
    expect(clock.now()).toBe(500);
    clock.advance(300);
    expect(clock.now()).toBe(800);
  });

  it("set replaces the current time absolutely", () => {
    const clock = makeFakeClock(100);
    clock.set(9999);
    expect(clock.now()).toBe(9999);
  });

  it("set followed by advance is cumulative from the set point", () => {
    const clock = makeFakeClock();
    clock.set(1000);
    clock.advance(250);
    expect(clock.now()).toBe(1250);
  });
});
