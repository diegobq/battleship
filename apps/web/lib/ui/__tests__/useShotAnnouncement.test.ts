import { describe, expect, it } from "vitest";
import { formatShot } from "../useShotAnnouncement";
import { ShotEvent } from "../types";

const shot = (overrides: Partial<ShotEvent> = {}): ShotEvent => ({
  shooterId: "me",
  r: 0,
  c: 0,
  hit: true,
  scoreAwarded: 10,
  cellStatus: "hit",
  at: 0,
  ...overrides,
});

describe("formatShot — hit by self", () => {
  it("describes a hit with score", () => {
    const s = formatShot(
      shot({ r: 4, c: 0, hit: true, scoreAwarded: 15 }),
      "me",
    );
    expect(s).toBe("You hit at A5. +15 points.");
  });

  it("maps column index to letter (B = index 1)", () => {
    const s = formatShot(shot({ c: 1 }), "me");
    expect(s).toContain("B1");
  });
});

describe("formatShot — miss by self", () => {
  it("describes a miss without score", () => {
    const s = formatShot(
      shot({ hit: false, cellStatus: "miss", scoreAwarded: 0 }),
      "me",
    );
    expect(s).toBe("You missed at A1.");
  });
});

describe("formatShot — sunk by self", () => {
  it("names the ship type and score", () => {
    const s = formatShot(
      shot({ sunkShipType: "Destroyer", scoreAwarded: 30 }),
      "me",
    );
    expect(s).toBe("You sunk the opponent's Destroyer at A1. +30 points.");
  });
});

describe("formatShot — events by opponent", () => {
  it("describes opponent hit", () => {
    const s = formatShot(shot({ shooterId: "them" }), "me");
    expect(s).toBe("Opponent hit your fleet at A1.");
  });

  it("describes opponent miss", () => {
    const s = formatShot(
      shot({ shooterId: "them", hit: false, cellStatus: "miss" }),
      "me",
    );
    expect(s).toBe("Opponent missed at A1.");
  });

  it("describes opponent sinking a ship", () => {
    const s = formatShot(
      shot({ shooterId: "them", sunkShipType: "Cruiser" }),
      "me",
    );
    expect(s).toBe("Opponent sunk your Cruiser at A1.");
  });
});
