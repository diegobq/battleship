export interface MessageRateLimiter {
  check(now?: number): boolean;
}

export function createMessageRateLimiter(
  maxPerWindow: number,
  windowMs: number,
): MessageRateLimiter {
  let count = 0;
  let windowStart = Date.now();

  return {
    check(now = Date.now()): boolean {
      if (now - windowStart > windowMs) {
        count = 0;
        windowStart = now;
      }
      return ++count <= maxPerWindow;
    },
  };
}
