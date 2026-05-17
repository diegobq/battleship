import { BoardCellStatus, Coordinate, Ship, ShipOrientation } from "./types";

export const BOARD_SIZE = 8;

export function createEmptyGrid(size = BOARD_SIZE): BoardCellStatus[][] {
  const grid: BoardCellStatus[][] = [];
  for (let r = 0; r < size; r++) {
    const row: BoardCellStatus[] = [];
    for (let c = 0; c < size; c++) {
      row.push("empty");
    }
    grid.push(row);
  }
  return grid;
}

function cloneGrid(grid: BoardCellStatus[][]): BoardCellStatus[][] {
  return grid.map((row) => [...row]);
}

export function isInBounds(r: number, c: number, size = BOARD_SIZE): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

export function expandShipCells(
  start: Coordinate,
  length: number,
  orientation: ShipOrientation,
): Coordinate[] {
  const cells: Coordinate[] = [];
  let { r, c } = start;
  for (let i = 0; i < length; i++) {
    cells.push({ r, c });
    if (orientation === "horizontal") c++;
    else r++;
  }
  return cells;
}

export function canPlace(
  grid: BoardCellStatus[][],
  start: Coordinate,
  length: number,
  orientation: ShipOrientation,
): boolean {
  const size = grid.length;
  const cells = expandShipCells(start, length, orientation);
  for (const { r, c } of cells) {
    if (!isInBounds(r, c, size)) return false;
    if (grid[r][c] !== "empty") return false;
  }
  return true;
}

export function applyPlacement(
  grid: BoardCellStatus[][],
  ship: Ship,
  start: Coordinate,
  orientation: ShipOrientation,
): { grid: BoardCellStatus[][]; ship: Ship } | null {
  if (!canPlace(grid, start, ship.length, orientation)) return null;
  const cells = expandShipCells(start, ship.length, orientation);
  const next = cloneGrid(grid);
  for (const { r, c } of cells) {
    next[r][c] = "ship";
  }
  return {
    grid: next,
    ship: { ...ship, positions: cells, orientation, placed: true },
  };
}

export function applyShot(
  grid: BoardCellStatus[][],
  r: number,
  c: number,
): { grid: BoardCellStatus[][]; hit: boolean; alreadyShot: boolean } {
  if (!isInBounds(r, c, grid.length)) {
    throw new Error(`Shot out of bounds: (${r}, ${c})`);
  }
  const cell = grid[r][c];
  if (cell === "hit" || cell === "miss") {
    return { grid, hit: false, alreadyShot: true };
  }
  const hit = cell === "ship";
  const next = cloneGrid(grid);
  next[r][c] = hit ? "hit" : "miss";
  return { grid: next, hit, alreadyShot: false };
}

export function countHiddenCells(grid: BoardCellStatus[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === "empty" || cell === "ship") count++;
    }
  }
  return count;
}

export function areAllShipsPlaced(ships: Ship[]): boolean {
  return ships.every((ship) => ship.placed);
}

export function areAllShipsSunk(ships: Ship[]): boolean {
  return ships.length > 0 && ships.every((ship) => ship.hits >= ship.length);
}
