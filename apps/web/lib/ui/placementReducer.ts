import { applyPlacement, canPlace, createEmptyGrid } from '@battleship/core';
import { BoardCellStatus, Coordinate, Ship, ShipOrientation } from '@battleship/core';

export interface PlacementState {
  grid: BoardCellStatus[][];
  ships: Ship[];
  selectedShipId: string | null;
  orientation: ShipOrientation;
}

export type PlacementAction =
  | { type: 'SELECT'; shipId: string }
  | { type: 'ROTATE' }
  | { type: 'PLACE'; r: number; c: number }
  | { type: 'REMOVE'; shipId: string }
  | { type: 'RESET' };

export function initPlacementState(initialShips: Ship[]): PlacementState {
  const reset = initialShips.map((s) => ({
    ...s,
    placed: false,
    positions: [] as Coordinate[],
    hits: 0,
    orientation: undefined,
  }));
  return {
    grid: createEmptyGrid(),
    ships: reset,
    selectedShipId: reset[0]?.id ?? null,
    orientation: 'horizontal',
  };
}

export function placementReducer(state: PlacementState, action: PlacementAction): PlacementState {
  switch (action.type) {
    case 'SELECT':
      return state.ships.some((s) => s.id === action.shipId)
        ? { ...state, selectedShipId: action.shipId }
        : state;
    case 'ROTATE':
      return {
        ...state,
        orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      };
    case 'PLACE':
      return applyPlaceAction(state, action.r, action.c);
    case 'REMOVE':
      return applyRemoveAction(state, action.shipId);
    case 'RESET':
      return initPlacementState(state.ships);
  }
}

function applyPlaceAction(state: PlacementState, r: number, c: number): PlacementState {
  if (!state.selectedShipId) return state;
  const ship = state.ships.find((s) => s.id === state.selectedShipId);
  if (!ship || ship.placed) return state;
  const result = applyPlacement(state.grid, ship, { r, c }, state.orientation);
  if (!result) return state;
  const ships = state.ships.map((s) => (s.id === ship.id ? result.ship : s));
  const next = ships.find((s) => !s.placed);
  return {
    ...state,
    grid: result.grid,
    ships,
    selectedShipId: next?.id ?? null,
  };
}

function applyRemoveAction(state: PlacementState, shipId: string): PlacementState {
  const ship = state.ships.find((s) => s.id === shipId);
  if (!ship || !ship.placed) return state;
  const ships = state.ships.map((s) =>
    s.id === shipId ? { ...s, placed: false, positions: [], orientation: undefined } : s,
  );
  const grid = rebuildGridFromShips(ships);
  return { ...state, grid, ships, selectedShipId: shipId };
}

function rebuildGridFromShips(ships: readonly Ship[]): BoardCellStatus[][] {
  const grid = createEmptyGrid();
  for (const s of ships) {
    if (!s.placed) continue;
    for (const p of s.positions) {
      grid[p.r][p.c] = 'ship';
    }
  }
  return grid;
}

export function canPreviewPlacement(state: PlacementState, r: number, c: number): boolean {
  if (!state.selectedShipId) return false;
  const ship = state.ships.find((s) => s.id === state.selectedShipId);
  if (!ship || ship.placed) return false;
  return canPlace(state.grid, { r, c }, ship.length, state.orientation);
}

export function allShipsPlaced(state: PlacementState): boolean {
  return state.ships.length > 0 && state.ships.every((s) => s.placed);
}
