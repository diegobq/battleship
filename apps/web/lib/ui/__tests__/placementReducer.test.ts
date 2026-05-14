import { describe, expect, it } from 'vitest';
import { Ship } from '@battleship/core';
import {
  allShipsPlaced,
  canPreviewPlacement,
  initPlacementState,
  placementReducer,
} from '../placementReducer';

function makeShip(id: string, length: number): Ship {
  return { id, type: 'Cruiser', length, hits: 0, positions: [], placed: false };
}

const fleet = [makeShip('s1', 2), makeShip('s2', 1)];

describe('initPlacementState', () => {
  it('returns an empty grid and ships with no placement info', () => {
    const s = initPlacementState(fleet);
    expect(s.grid.flat().every((c) => c === 'empty')).toBe(true);
    expect(s.ships).toHaveLength(2);
    for (const ship of s.ships) {
      expect(ship.placed).toBe(false);
      expect(ship.positions).toEqual([]);
    }
    expect(s.selectedShipId).toBe('s1');
    expect(s.orientation).toBe('horizontal');
  });
});

describe('SELECT', () => {
  it('switches the selected ship', () => {
    const next = placementReducer(initPlacementState(fleet), { type: 'SELECT', shipId: 's2' });
    expect(next.selectedShipId).toBe('s2');
  });

  it('ignores selection of unknown ship ids', () => {
    const init = initPlacementState(fleet);
    const next = placementReducer(init, { type: 'SELECT', shipId: 'ghost' });
    expect(next).toBe(init);
  });
});

describe('ROTATE', () => {
  it('toggles between horizontal and vertical', () => {
    const init = initPlacementState(fleet);
    const a = placementReducer(init, { type: 'ROTATE' });
    expect(a.orientation).toBe('vertical');
    const b = placementReducer(a, { type: 'ROTATE' });
    expect(b.orientation).toBe('horizontal');
  });
});

describe('PLACE', () => {
  it('places the selected ship and marks the grid', () => {
    const next = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    expect(next.grid[0][0]).toBe('ship');
    expect(next.grid[0][1]).toBe('ship');
    expect(next.ships[0].placed).toBe(true);
    expect(next.ships[0].positions).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
    ]);
  });

  it('auto-selects the next unplaced ship after placement', () => {
    const next = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    expect(next.selectedShipId).toBe('s2');
  });

  it('rejects placement outside bounds', () => {
    const init = initPlacementState(fleet);
    const next = placementReducer(init, { type: 'PLACE', r: 0, c: 7 });
    expect(next.grid).toBe(init.grid);
    expect(next.ships[0].placed).toBe(false);
  });

  it('rejects placement that would collide with another ship', () => {
    const a = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    const b = placementReducer(a, { type: 'PLACE', r: 0, c: 1 });
    expect(b).toBe(a);
  });

  it('does nothing when no ship is selected', () => {
    const init = initPlacementState(fleet);
    const noSelect = placementReducer(init, { type: 'SELECT', shipId: 'ghost' });
    const stateWithNoSelection = { ...noSelect, selectedShipId: null };
    const next = placementReducer(stateWithNoSelection, { type: 'PLACE', r: 0, c: 0 });
    expect(next).toBe(stateWithNoSelection);
  });
});

describe('REMOVE', () => {
  it('removes a placed ship and clears its grid cells', () => {
    let s = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    s = placementReducer(s, { type: 'PLACE', r: 2, c: 0 });
    expect(s.ships.every((sh) => sh.placed)).toBe(true);
    const removed = placementReducer(s, { type: 'REMOVE', shipId: 's1' });
    expect(removed.ships[0].placed).toBe(false);
    expect(removed.grid[0][0]).toBe('empty');
    expect(removed.grid[2][0]).toBe('ship'); // other ship still placed
  });

  it('is a no-op for an unplaced ship', () => {
    const init = initPlacementState(fleet);
    const next = placementReducer(init, { type: 'REMOVE', shipId: 's1' });
    expect(next).toBe(init);
  });
});

describe('RESET', () => {
  it('returns to the initial state', () => {
    let s = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    s = placementReducer(s, { type: 'ROTATE' });
    const reset = placementReducer(s, { type: 'RESET' });
    expect(reset.grid.flat().every((c) => c === 'empty')).toBe(true);
    expect(reset.orientation).toBe('horizontal');
    expect(reset.selectedShipId).toBe('s1');
  });
});

describe('canPreviewPlacement', () => {
  it('returns true for a valid placement', () => {
    expect(canPreviewPlacement(initPlacementState(fleet), 0, 0)).toBe(true);
  });

  it('returns false when the placement would be illegal', () => {
    expect(canPreviewPlacement(initPlacementState(fleet), 0, 7)).toBe(false);
  });

  it('returns false when the selected ship is already placed', () => {
    const placed = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    const reselected = placementReducer(placed, { type: 'SELECT', shipId: 's1' });
    expect(canPreviewPlacement(reselected, 5, 0)).toBe(false);
  });
});

describe('allShipsPlaced', () => {
  it('is false initially', () => {
    expect(allShipsPlaced(initPlacementState(fleet))).toBe(false);
  });

  it('is true after every ship has been placed', () => {
    let s = placementReducer(initPlacementState(fleet), { type: 'PLACE', r: 0, c: 0 });
    s = placementReducer(s, { type: 'PLACE', r: 2, c: 0 });
    expect(allShipsPlaced(s)).toBe(true);
  });
});
