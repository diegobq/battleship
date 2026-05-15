import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  applyPlacement,
  applyShot,
  areAllShipsPlaced,
  areAllShipsSunk,
  canPlace,
  cloneGrid,
  countHiddenCells,
  createEmptyGrid,
  expandShipCells,
  isInBounds,
} from "../board";
import { Ship } from "../types";

function ship(id: string, length: number): Ship {
  return { id, type: "Cruiser", length, hits: 0, positions: [], placed: false };
}

describe("createEmptyGrid", () => {
  it("creates an 8x8 grid of empty cells", () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(BOARD_SIZE);
    for (const row of grid) {
      expect(row.length).toBe(BOARD_SIZE);
      for (const cell of row) {
        expect(cell).toBe("empty");
      }
    }
  });

  it("returns a fresh grid on every call", () => {
    const a = createEmptyGrid();
    a[0][0] = "ship";
    const b = createEmptyGrid();
    expect(b[0][0]).toBe("empty");
  });
});

describe("isInBounds", () => {
  it("accepts coordinates within [0, BOARD_SIZE)", () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(7, 7)).toBe(true);
    expect(isInBounds(3, 5)).toBe(true);
  });

  it("rejects negative coordinates", () => {
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, -1)).toBe(false);
  });

  it("rejects coordinates at or beyond BOARD_SIZE", () => {
    expect(isInBounds(BOARD_SIZE, 0)).toBe(false);
    expect(isInBounds(0, BOARD_SIZE)).toBe(false);
    expect(isInBounds(99, 0)).toBe(false);
  });
});

describe("expandShipCells", () => {
  it("expands a length-3 horizontal ship rightward", () => {
    expect(expandShipCells({ r: 0, c: 0 }, 3, "horizontal")).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ]);
  });

  it("expands a length-3 vertical ship downward", () => {
    expect(expandShipCells({ r: 0, c: 0 }, 3, "vertical")).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ]);
  });

  it("expands a length-1 ship to a single cell", () => {
    expect(expandShipCells({ r: 5, c: 5 }, 1, "horizontal")).toEqual([
      { r: 5, c: 5 },
    ]);
  });
});

describe("canPlace", () => {
  it("allows placement within bounds on an empty grid", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 0, c: 0 }, 3, "horizontal")).toBe(true);
    expect(canPlace(grid, { r: 5, c: 0 }, 3, "vertical")).toBe(true);
  });

  it("rejects placement that extends past the right edge", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 0, c: 6 }, 3, "horizontal")).toBe(false);
  });

  it("rejects placement that extends past the bottom edge", () => {
    const grid = createEmptyGrid();
    expect(canPlace(grid, { r: 6, c: 0 }, 3, "vertical")).toBe(false);
  });

  it("rejects placement that collides with an existing ship", () => {
    const grid = createEmptyGrid();
    const result = applyPlacement(
      grid,
      ship("s1", 3),
      { r: 0, c: 0 },
      "horizontal",
    );
    expect(result).not.toBeNull();
    expect(canPlace(result!.grid, { r: 0, c: 1 }, 2, "vertical")).toBe(false);
  });
});

describe("applyPlacement", () => {
  it("places a ship without mutating the original grid", () => {
    const grid = createEmptyGrid();
    const result = applyPlacement(
      grid,
      ship("s1", 3),
      { r: 0, c: 0 },
      "horizontal",
    );
    expect(result).not.toBeNull();
    expect(result!.grid[0][0]).toBe("ship");
    expect(result!.grid[0][1]).toBe("ship");
    expect(result!.grid[0][2]).toBe("ship");
    expect(grid[0][0]).toBe("empty");
  });

  it("returns a placed ship with positions and orientation set", () => {
    const grid = createEmptyGrid();
    const result = applyPlacement(
      grid,
      ship("s1", 2),
      { r: 3, c: 4 },
      "vertical",
    );
    expect(result).not.toBeNull();
    expect(result!.ship.placed).toBe(true);
    expect(result!.ship.orientation).toBe("vertical");
    expect(result!.ship.positions).toEqual([
      { r: 3, c: 4 },
      { r: 4, c: 4 },
    ]);
  });

  it("returns null when placement is invalid", () => {
    const grid = createEmptyGrid();
    expect(
      applyPlacement(grid, ship("s1", 3), { r: 0, c: 6 }, "horizontal"),
    ).toBeNull();
  });

  it("does not mutate the ship object when placement fails", () => {
    const grid = createEmptyGrid();
    const original = ship("s1", 3);
    applyPlacement(grid, original, { r: 0, c: 6 }, "horizontal");
    expect(original.placed).toBe(false);
    expect(original.positions).toEqual([]);
  });
});

describe("applyShot", () => {
  it("marks a missed cell as miss", () => {
    const grid = createEmptyGrid();
    const result = applyShot(grid, 4, 4);
    expect(result.hit).toBe(false);
    expect(result.alreadyShot).toBe(false);
    expect(result.grid[4][4]).toBe("miss");
    expect(grid[4][4]).toBe("empty");
  });

  it("marks a ship cell as hit", () => {
    const placed = applyPlacement(
      createEmptyGrid(),
      ship("s1", 2),
      { r: 0, c: 0 },
      "horizontal",
    );
    const result = applyShot(placed!.grid, 0, 0);
    expect(result.hit).toBe(true);
    expect(result.grid[0][0]).toBe("hit");
  });

  it("reports alreadyShot when the cell has been shot before", () => {
    const after = applyShot(createEmptyGrid(), 0, 0);
    const second = applyShot(after.grid, 0, 0);
    expect(second.alreadyShot).toBe(true);
    expect(second.hit).toBe(false);
  });

  it("throws when shot is out of bounds", () => {
    const grid = createEmptyGrid();
    expect(() => applyShot(grid, -1, 0)).toThrow(/out of bounds/i);
    expect(() => applyShot(grid, 0, 99)).toThrow(/out of bounds/i);
  });
});

describe("countHiddenCells", () => {
  it("counts every empty + ship cell as hidden", () => {
    expect(countHiddenCells(createEmptyGrid())).toBe(64);
  });

  it("excludes hit and miss cells from the count", () => {
    const placed = applyPlacement(
      createEmptyGrid(),
      ship("s1", 1),
      { r: 0, c: 0 },
      "horizontal",
    );
    const afterHit = applyShot(placed!.grid, 0, 0);
    const afterMiss = applyShot(afterHit.grid, 1, 1);
    expect(countHiddenCells(afterMiss.grid)).toBe(62);
  });
});

describe("areAllShipsPlaced", () => {
  it("returns true when every ship has placed = true", () => {
    const a = ship("a", 1);
    a.placed = true;
    const b = ship("b", 2);
    b.placed = true;
    expect(areAllShipsPlaced([a, b])).toBe(true);
  });

  it("returns false when any ship is not placed", () => {
    const a = ship("a", 1);
    a.placed = true;
    expect(areAllShipsPlaced([a, ship("b", 2)])).toBe(false);
  });

  it("returns true for an empty fleet", () => {
    expect(areAllShipsPlaced([])).toBe(true);
  });
});

describe("areAllShipsSunk", () => {
  it("returns true when every ship has hits >= length", () => {
    const a = ship("a", 1);
    a.hits = 1;
    const b = ship("b", 2);
    b.hits = 2;
    expect(areAllShipsSunk([a, b])).toBe(true);
  });

  it("returns false when any ship is not fully hit", () => {
    const a = ship("a", 2);
    a.hits = 1;
    expect(areAllShipsSunk([a])).toBe(false);
  });

  it("returns false for an empty fleet", () => {
    expect(areAllShipsSunk([])).toBe(false);
  });
});

describe("cloneGrid", () => {
  it("returns a deep enough copy that row mutation does not leak", () => {
    const grid = createEmptyGrid();
    const copy = cloneGrid(grid);
    copy[0][0] = "ship";
    expect(grid[0][0]).toBe("empty");
  });
});

describe("createEmptyGrid — custom board size", () => {
  it("creates a 6x6 grid when size=6", () => {
    const grid = createEmptyGrid(6);
    expect(grid.length).toBe(6);
    for (const row of grid) expect(row.length).toBe(6);
  });
});

describe("isInBounds — custom board size", () => {
  it("accepts coordinates within the custom size", () => {
    expect(isInBounds(0, 0, 6)).toBe(true);
    expect(isInBounds(5, 5, 6)).toBe(true);
  });

  it("rejects coordinates at or beyond the custom size", () => {
    expect(isInBounds(6, 0, 6)).toBe(false);
    expect(isInBounds(0, 6, 6)).toBe(false);
  });
});

describe("canPlace — honours grid dimensions as board size", () => {
  it("rejects placement that would exceed a 6x6 grid", () => {
    const grid = createEmptyGrid(6);
    expect(canPlace(grid, { r: 4, c: 0 }, 3, "vertical")).toBe(false);
  });

  it("accepts placement that fits within a 6x6 grid", () => {
    const grid = createEmptyGrid(6);
    expect(canPlace(grid, { r: 3, c: 0 }, 3, "vertical")).toBe(true);
  });
});
