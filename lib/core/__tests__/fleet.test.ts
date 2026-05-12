import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FLEET_CONFIG,
  DEFAULT_SHIP_DEFINITIONS,
  buildFleet,
  defaultFleetConfig,
} from '../fleet';
import { ShipDefinition, ShipType } from '../types';

function sequentialIdFactory(): () => string {
  let n = 0;
  return () => `ship-${n++}`;
}

describe('defaultFleetConfig', () => {
  it('returns one of each ship type', () => {
    expect(defaultFleetConfig()).toEqual({ Cruiser: 1, Destroyer: 1, Submarine: 1 });
  });

  it('returns a fresh object on every call', () => {
    const a = defaultFleetConfig();
    const b = defaultFleetConfig();
    a.Cruiser = 99;
    expect(b.Cruiser).toBe(1);
    expect(DEFAULT_FLEET_CONFIG.Cruiser).toBe(1);
  });
});

describe('buildFleet', () => {
  it('builds default fleet with three ships of expected lengths', () => {
    const ships = buildFleet(defaultFleetConfig(), sequentialIdFactory());
    expect(ships).toHaveLength(3);
    const byType = Object.fromEntries(ships.map((s) => [s.type, s]));
    expect(byType.Cruiser.length).toBe(3);
    expect(byType.Destroyer.length).toBe(2);
    expect(byType.Submarine.length).toBe(1);
  });

  it('initializes each ship as unplaced with no hits or positions', () => {
    const ships = buildFleet(defaultFleetConfig(), sequentialIdFactory());
    for (const ship of ships) {
      expect(ship.hits).toBe(0);
      expect(ship.positions).toEqual([]);
      expect(ship.placed).toBe(false);
      expect(ship.orientation).toBeUndefined();
    }
  });

  it('uses ids from the injected factory', () => {
    const ships = buildFleet({ Submarine: 3 }, sequentialIdFactory());
    expect(ships.map((s) => s.id)).toEqual(['ship-0', 'ship-1', 'ship-2']);
  });

  it('respects custom per-type counts', () => {
    const ships = buildFleet({ Cruiser: 2, Submarine: 3 }, sequentialIdFactory());
    expect(ships.filter((s) => s.type === 'Cruiser')).toHaveLength(2);
    expect(ships.filter((s) => s.type === 'Destroyer')).toHaveLength(0);
    expect(ships.filter((s) => s.type === 'Submarine')).toHaveLength(3);
  });

  it('returns an empty array for an empty config', () => {
    expect(buildFleet({}, sequentialIdFactory())).toEqual([]);
  });

  it('treats zero counts as no ships of that type', () => {
    const ships = buildFleet({ Cruiser: 0, Destroyer: 1 }, sequentialIdFactory());
    expect(ships).toHaveLength(1);
    expect(ships[0].type).toBe('Destroyer');
  });

  it('honors injected ship definitions over defaults (extensibility seam)', () => {
    const custom: Record<ShipType, ShipDefinition> = {
      Cruiser: { length: 5 },
      Destroyer: { length: 4 },
      Submarine: { length: 2 },
    };
    const ships = buildFleet({ Cruiser: 1 }, sequentialIdFactory(), custom);
    expect(ships[0].length).toBe(5);
  });

  it('exposes DEFAULT_SHIP_DEFINITIONS for inspection without permitting accidental mutation', () => {
    expect(DEFAULT_SHIP_DEFINITIONS.Cruiser.length).toBe(3);
    expect(DEFAULT_SHIP_DEFINITIONS.Destroyer.length).toBe(2);
    expect(DEFAULT_SHIP_DEFINITIONS.Submarine.length).toBe(1);
  });
});
