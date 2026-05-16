import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { formatShot, useShotAnnouncement } from "../useShotAnnouncement";
import type { ShotEvent } from "../types";

function makeShot(overrides: Partial<ShotEvent> = {}): ShotEvent {
  return {
    shooterId: "me",
    r: 0,
    c: 0,
    hit: true,
    scoreAwarded: 10,
    cellStatus: "hit",
    at: Date.now(),
    ...overrides,
  };
}

// ─── formatShot (pure) ────────────────────────────────────────────────────────

describe("formatShot", () => {
  it("describes own hit with score", () => {
    const msg = formatShot(makeShot({ shooterId: "me", hit: true, scoreAwarded: 10 }), "me");
    expect(msg).toContain("You hit");
    expect(msg).toContain("+10 points");
  });

  it("describes own miss", () => {
    const msg = formatShot(makeShot({ shooterId: "me", hit: false, cellStatus: "miss" }), "me");
    expect(msg).toContain("You missed");
  });

  it("describes own sunk ship", () => {
    const msg = formatShot(makeShot({ shooterId: "me", sunkShipType: "Submarine", scoreAwarded: 20 }), "me");
    expect(msg).toContain("You sunk");
    expect(msg).toContain("Submarine");
    expect(msg).toContain("+20 points");
  });

  it("describes opponent hit", () => {
    const msg = formatShot(makeShot({ shooterId: "them", hit: true }), "me");
    expect(msg).toContain("Opponent hit");
  });

  it("describes opponent miss", () => {
    const msg = formatShot(makeShot({ shooterId: "them", hit: false, cellStatus: "miss" }), "me");
    expect(msg).toContain("Opponent missed");
  });

  it("describes opponent sinking my ship", () => {
    const msg = formatShot(makeShot({ shooterId: "them", sunkShipType: "Cruiser" }), "me");
    expect(msg).toContain("Opponent sunk your Cruiser");
  });

  it("uses the column letter for coordinate display", () => {
    const msg = formatShot(makeShot({ c: 0 }), "me"); // col A
    expect(msg).toContain("A1");
  });
});

// ─── useShotAnnouncement (hook) ───────────────────────────────────────────────

describe("useShotAnnouncement", () => {
  it("starts with an empty announcement list", () => {
    const { result } = renderHook(() => useShotAnnouncement(null, "me"));
    expect(result.current).toEqual([]);
  });

  it("appends a sentence when a shot arrives", () => {
    const shot = makeShot({ shooterId: "me", hit: true, scoreAwarded: 10 });
    const { result, rerender } = renderHook(
      ({ s }) => useShotAnnouncement(s, "me"),
      { initialProps: { s: null as ShotEvent | null } },
    );
    act(() => rerender({ s: shot }));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toContain("You hit");
  });

  it("accumulates multiple shots into the list", () => {
    const shot1 = makeShot({ shooterId: "me", hit: true, at: 1 });
    const shot2 = makeShot({ shooterId: "them", hit: false, cellStatus: "miss", at: 2 });
    const { result, rerender } = renderHook(
      ({ s }) => useShotAnnouncement(s, "me"),
      { initialProps: { s: null as ShotEvent | null } },
    );
    act(() => rerender({ s: shot1 }));
    act(() => rerender({ s: shot2 }));
    expect(result.current).toHaveLength(2);
  });
});
