import { describe, it, expect } from "vitest";
import {
  createEmptyGrid,
  cloneGrid,
  isInBounds,
  expandShipCells,
  canPlace,
  applyPlacement,
  applyShot,
  countHiddenCells,
  areAllShipsPlaced,
  areAllShipsSunk,
  BOARD_SIZE,
} from "../board";
import type { Ship } from "../types";

function makeShip(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "s1",
    type: "Submarine",
    length: 1,
    hits: 0,
    positions: [],
    placed: false,
    ...overrides,
  };
}

describe("isInBounds", () => {
  it("accepts all four corners of the default 8×8 grid", () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(0, 7)).toBe(true);
    expect(isInBounds(7, 0)).toBe(true);
    expect(isInBounds(7, 7)).toBe(true);
  });

  it("rejects cells one step outside each edge", () => {
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, -1)).toBe(false);
    expect(isInBounds(8, 0)).toBe(false);
    expect(isInBounds(0, 8)).toBe(false);
  });

  it("respects a custom board size", () => {
    expect(isInBounds(5, 5, 6)).toBe(true);
    expect(isInBounds(6, 0, 6)).toBe(false);
  });
});

describe("expandShipCells", () => {
  it("returns a single cell for length 1", () => {
    expect(expandShipCells({ r: 2, c: 3 }, 1, "horizontal")).toEqual([
      { r: 2, c: 3 },
    ]);
  });

  it("expands horizontally along columns", () => {
    expect(expandShipCells({ r: 0, c: 0 }, 3, "horizontal")).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ]);
  });

  it("expands vertically along rows", () => {
    expect(expandShipCells({ r: 0, c: 0 }, 3, "vertical")).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ]);
  });
});

describe("canPlace", () => {
  it("allows placement on an empty grid", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 0, c: 0 }, 3, "horizontal")).toBe(true);
  });

  it("rejects placement that extends off the right edge", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 0, c: 6 }, 3, "horizontal")).toBe(false);
  });

  it("rejects placement that extends off the bottom edge", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 6, c: 0 }, 3, "vertical")).toBe(false);
  });

  it("rejects placement that collides with an existing ship", () => {
    const grid = createEmptyGrid();
    grid[0][1] = "ship";
    expect(canPlace(grid, { r: 0, c: 0 }, 3, "horizontal")).toBe(false);
  });

  it("allows placement next to an existing ship (no adjacency rule)", () => {
    const grid = createEmptyGrid();
    grid[0][0] = "ship";
    expect(canPlace(grid, { r: 1, c: 0 }, 3, "horizontal")).toBe(true);
  });
});

describe("applyPlacement", () => {
  it("returns null when placement is invalid", () => {
    const grid = createEmptyGrid();
    const ship = makeShip({ length: 3 });
    expect(applyPlacement(grid, ship, { r: 0, c: 7 }, "horizontal")).toBeNull();
  });

  it("marks the correct cells as 'ship'", () => {
    const grid = createEmptyGrid();
    const ship = makeShip({ length: 2 });
    const result = applyPlacement(grid, ship, { r: 1, c: 2 }, "horizontal");
    expect(result).not.toBeNull();
    expect(result!.grid[1][2]).toBe("ship");
    expect(result!.grid[1][3]).toBe("ship");
    expect(result!.grid[1][4]).toBe("empty");
  });

  it("does not mutate the original grid", () => {
    const grid = createEmptyGrid();
    const ship = makeShip({ length: 1 });
    applyPlacement(grid, ship, { r: 0, c: 0 }, "horizontal");
    expect(grid[0][0]).toBe("empty");
  });

  it("marks the ship as placed with positions and orientation", () => {
    const grid = createEmptyGrid();
    const ship = makeShip({ length: 2 });
    const result = applyPlacement(grid, ship, { r: 0, c: 0 }, "vertical");
    expect(result!.ship.placed).toBe(true);
    expect(result!.ship.orientation).toBe("vertical");
    expect(result!.ship.positions).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
    ]);
  });
});

describe("applyShot", () => {
  it("marks an empty cell as 'miss'", () => {
    const grid = createEmptyGrid();
    const { grid: next, hit, alreadyShot } = applyShot(grid, 0, 0);
    expect(next[0][0]).toBe("miss");
    expect(hit).toBe(false);
    expect(alreadyShot).toBe(false);
  });

  it("marks a ship cell as 'hit'", () => {
    const grid = createEmptyGrid();
    grid[3][3] = "ship";
    const { grid: next, hit } = applyShot(grid, 3, 3);
    expect(next[3][3]).toBe("hit");
    expect(hit).toBe(true);
  });

  it("returns alreadyShot=true without changing state on a repeated shot", () => {
    const grid = createEmptyGrid();
    grid[0][0] = "miss";
    const { grid: next, alreadyShot } = applyShot(grid, 0, 0);
    expect(alreadyShot).toBe(true);
    expect(next).toBe(grid);
  });

  it("throws on out-of-bounds coordinates", () => {
    const grid = createEmptyGrid();
    expect(() => applyShot(grid, -1, 0)).toThrow();
    expect(() => applyShot(grid, 0, BOARD_SIZE)).toThrow();
  });

  it("does not mutate the original grid on a valid shot", () => {
    const grid = createEmptyGrid();
    applyShot(grid, 2, 2);
    expect(grid[2][2]).toBe("empty");
  });
});

describe("countHiddenCells", () => {
  it("returns 64 for a fresh 8×8 grid", () => {
    expect(countHiddenCells(createEmptyGrid())).toBe(64);
  });

  it("counts 'ship' cells as hidden", () => {
    const grid = createEmptyGrid();
    grid[0][0] = "ship";
    expect(countHiddenCells(grid)).toBe(64);
  });

  it("does not count 'hit' or 'miss' cells as hidden", () => {
    const grid = createEmptyGrid();
    grid[0][0] = "hit";
    grid[0][1] = "miss";
    expect(countHiddenCells(grid)).toBe(62);
  });
});

describe("areAllShipsPlaced", () => {
  it("returns true when every ship is placed", () => {
    const ships = [makeShip({ placed: true }), makeShip({ placed: true })];
    expect(areAllShipsPlaced(ships)).toBe(true);
  });

  it("returns false when any ship is unplaced", () => {
    const ships = [makeShip({ placed: true }), makeShip({ placed: false })];
    expect(areAllShipsPlaced(ships)).toBe(false);
  });

  it("returns true for an empty fleet", () => {
    expect(areAllShipsPlaced([])).toBe(true);
  });
});

describe("areAllShipsSunk", () => {
  it("returns true when every ship's hits equal its length", () => {
    const ships = [
      makeShip({ length: 1, hits: 1 }),
      makeShip({ length: 2, hits: 2 }),
    ];
    expect(areAllShipsSunk(ships)).toBe(true);
  });

  it("returns false when any ship has remaining hits", () => {
    const ships = [makeShip({ length: 2, hits: 1 })];
    expect(areAllShipsSunk(ships)).toBe(false);
  });

  it("returns false for an empty fleet", () => {
    expect(areAllShipsSunk([])).toBe(false);
  });
});
