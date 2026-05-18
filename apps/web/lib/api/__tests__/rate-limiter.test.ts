import { describe, it, expect } from "vitest";
import { createMessageRateLimiter } from "../rate-limiter";

describe("createMessageRateLimiter", () => {
  it("allows messages up to the limit within one window", () => {
    const limiter = createMessageRateLimiter(3, 1_000);
    const t = Date.now();
    expect(limiter.check(t)).toBe(true);
    expect(limiter.check(t + 100)).toBe(true);
    expect(limiter.check(t + 200)).toBe(true);
  });

  it("rejects the message that exceeds the limit", () => {
    const limiter = createMessageRateLimiter(3, 1_000);
    const t = Date.now();
    limiter.check(t);
    limiter.check(t);
    limiter.check(t);
    expect(limiter.check(t)).toBe(false);
  });

  it("resets the count after the window expires", () => {
    const limiter = createMessageRateLimiter(3, 1_000);
    const t = Date.now();
    limiter.check(t);
    limiter.check(t);
    limiter.check(t);
    expect(limiter.check(t + 1_001)).toBe(true);
  });

  it("continues rejecting within the same overflowed window", () => {
    const limiter = createMessageRateLimiter(2, 1_000);
    const t = Date.now();
    limiter.check(t);
    limiter.check(t);
    expect(limiter.check(t + 500)).toBe(false);
    expect(limiter.check(t + 900)).toBe(false);
  });

  it("uses the current time when no argument is passed", () => {
    const limiter = createMessageRateLimiter(1, 1_000);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
  });
});
