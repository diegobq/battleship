export interface Clock {
  now(): number;
}

export interface FakeClock extends Clock {
  advance(ms: number): void;
  set(ms: number): void;
}

export function makeSystemClock(): Clock {
  return { now: () => Date.now() };
}

export function makeFakeClock(start = 0): FakeClock {
  let current = start;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
    set: (ms) => {
      current = ms;
    },
  };
}
