import { describe, it, expect, vi } from "vitest";
import {
  buildFleet,
  defaultFleetConfig,
  DEFAULT_FLEET_CONFIG,
  DEFAULT_SHIP_DEFINITIONS,
} from "../fleet";

describe("defaultFleetConfig", () => {
  it("returns the standard 3-ship config", () => {
    expect(defaultFleetConfig()).toEqual({
      Cruiser: 1,
      Destroyer: 1,
      Submarine: 1,
    });
  });

  it("returns a fresh copy each call (no shared mutation)", () => {
    const a = defaultFleetConfig();
    const b = defaultFleetConfig();
    a.Cruiser = 99;
    expect(b.Cruiser).toBe(DEFAULT_FLEET_CONFIG.Cruiser);
  });
});

describe("buildFleet", () => {
  it("creates one ship per entry in the default config", () => {
    let counter = 0;
    const fleet = buildFleet(defaultFleetConfig(), () => `id-${++counter}`);
    expect(fleet).toHaveLength(3);
  });

  it("assigns the correct length from DEFAULT_SHIP_DEFINITIONS", () => {
    const fleet = buildFleet(defaultFleetConfig(), () => "id");
    const cruiser = fleet.find((s) => s.type === "Cruiser");
    const destroyer = fleet.find((s) => s.type === "Destroyer");
    const submarine = fleet.find((s) => s.type === "Submarine");
    expect(cruiser?.length).toBe(DEFAULT_SHIP_DEFINITIONS.Cruiser.length);
    expect(destroyer?.length).toBe(DEFAULT_SHIP_DEFINITIONS.Destroyer.length);
    expect(submarine?.length).toBe(DEFAULT_SHIP_DEFINITIONS.Submarine.length);
  });

  it("calls idFactory once per ship", () => {
    const idFactory = vi.fn().mockReturnValue("x");
    buildFleet(defaultFleetConfig(), idFactory);
    expect(idFactory).toHaveBeenCalledTimes(3);
  });

  it("initialises each ship as unplaced with zero hits and empty positions", () => {
    const fleet = buildFleet(defaultFleetConfig(), () => "id");
    for (const ship of fleet) {
      expect(ship.placed).toBe(false);
      expect(ship.hits).toBe(0);
      expect(ship.positions).toEqual([]);
    }
  });

  it("respects a count greater than 1", () => {
    let n = 0;
    const fleet = buildFleet({ Submarine: 3 }, () => `id-${++n}`);
    expect(fleet).toHaveLength(3);
    expect(fleet.every((s) => s.type === "Submarine")).toBe(true);
  });

  it("skips types whose count is 0", () => {
    const fleet = buildFleet({ Cruiser: 0, Destroyer: 1 }, () => "id");
    expect(fleet).toHaveLength(1);
    expect(fleet[0].type).toBe("Destroyer");
  });
});
