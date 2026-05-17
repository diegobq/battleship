import { describe, it, expect, beforeEach } from "vitest";
import {
  IdempotencyCache,
  getIdempotencyCache,
  __resetIdempotencyCacheForTests,
} from "../idempotency";

const ENTRY = { gameId: "g1", playerId: "p1", cookieValue: "tok" };

describe("IdempotencyCache", () => {
  it("returns undefined for an unknown key", () => {
    const cache = new IdempotencyCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns the stored value within TTL", () => {
    const cache = new IdempotencyCache(60_000);
    cache.set("k1", ENTRY);
    expect(cache.get("k1")).toEqual(ENTRY);
  });

  it("returns undefined after the TTL has elapsed", () => {
    const cache = new IdempotencyCache(1_000);
    const now = 1_000_000;
    cache.set("k1", ENTRY, now);
    expect(cache.get("k1", now + 1_001)).toBeUndefined();
  });

  it("evicts the expired entry on read", () => {
    const cache = new IdempotencyCache(1_000);
    const now = 1_000_000;
    cache.set("k1", ENTRY, now);
    cache.get("k1", now + 2_000);
    expect(cache.size).toBe(0);
  });

  it("overwrites an existing key", () => {
    const cache = new IdempotencyCache();
    const second = { gameId: "g2", playerId: "p2", cookieValue: "tok2" };
    cache.set("k1", ENTRY);
    cache.set("k1", second);
    expect(cache.get("k1")).toEqual(second);
  });

  it("size reflects the number of stored entries", () => {
    const cache = new IdempotencyCache();
    cache.set("k1", ENTRY);
    cache.set("k2", ENTRY);
    expect(cache.size).toBe(2);
  });
});

describe("getIdempotencyCache singleton", () => {
  beforeEach(() => __resetIdempotencyCacheForTests());

  it("returns the same instance on successive calls", () => {
    expect(getIdempotencyCache()).toBe(getIdempotencyCache());
  });

  it("__reset forces a fresh instance on the next call", () => {
    const first = getIdempotencyCache();
    __resetIdempotencyCacheForTests();
    expect(getIdempotencyCache()).not.toBe(first);
  });
});
