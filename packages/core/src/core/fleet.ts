import { FleetConfig, Ship, ShipDefinition, ShipType } from "./types";

export const DEFAULT_SHIP_DEFINITIONS: Readonly<
  Record<ShipType, ShipDefinition>
> = {
  Cruiser: { length: 3 },
  Destroyer: { length: 2 },
  Submarine: { length: 1 },
};

export const DEFAULT_FLEET_CONFIG: Readonly<FleetConfig> = {
  Cruiser: 1,
  Destroyer: 1,
  Submarine: 1,
};

export function defaultFleetConfig(): FleetConfig {
  return { ...DEFAULT_FLEET_CONFIG };
}

export function buildFleet(
  config: FleetConfig,
  idFactory: () => string,
  definitions: Readonly<
    Record<ShipType, ShipDefinition>
  > = DEFAULT_SHIP_DEFINITIONS,
): Ship[] {
  const ships: Ship[] = [];
  for (const type of Object.keys(config) as ShipType[]) {
    const count = config[type] ?? 0;
    const def = definitions[type];
    if (!def) continue;
    for (let i = 0; i < count; i++) {
      ships.push({
        id: idFactory(),
        type,
        length: def.length,
        hits: 0,
        positions: [],
        placed: false,
      });
    }
  }
  return ships;
}
