import { describe, expect, it } from "vitest";
import { makeFakeClock, makeSystemClock } from "../clock";

describe("makeSystemClock", () => {
  it("returns a value close to Date.now()", () => {
    const clock = makeSystemClock();
    const before = Date.now();
    const reading = clock.now();
    const after = Date.now();
    expect(reading).toBeGreaterThanOrEqual(before);
    expect(reading).toBeLessThanOrEqual(after);
  });
});

describe("makeFakeClock", () => {
  it("starts at zero by default", () => {
    const clock = makeFakeClock();
    expect(clock.now()).toBe(0);
  });

  it("starts at the given value", () => {
    const clock = makeFakeClock(1_700_000_000_000);
    expect(clock.now()).toBe(1_700_000_000_000);
  });

  it("advances by the given amount", () => {
    const clock = makeFakeClock(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
    clock.advance(25);
    expect(clock.now()).toBe(175);
  });

  it("sets to an absolute value", () => {
    const clock = makeFakeClock(100);
    clock.set(500);
    expect(clock.now()).toBe(500);
  });

  it("does not auto-advance between reads", () => {
    const clock = makeFakeClock(42);
    expect(clock.now()).toBe(42);
    expect(clock.now()).toBe(42);
  });
});
