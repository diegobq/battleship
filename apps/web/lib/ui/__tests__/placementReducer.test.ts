import { describe, it, expect } from "vitest";
import {
  placementReducer,
  initPlacementState,
  allShipsPlaced,
  canPreviewPlacement,
} from "../placementReducer";
import type { Ship } from "@battleship/core";

function makeShip(id: string, length = 2): Ship {
  return {
    id,
    type: "Destroyer",
    length,
    hits: 0,
    positions: [],
    placed: false,
  };
}

function makeState(ships: Ship[] = [makeShip("s1")]) {
  return initPlacementState(ships);
}

describe("initPlacementState", () => {
  it("selects the first ship automatically", () => {
    const state = makeState([makeShip("a"), makeShip("b")]);
    expect(state.selectedShipId).toBe("a");
  });

  it("resets all ships to unplaced", () => {
    const placed: Ship = {
      ...makeShip("s1"),
      placed: true,
      positions: [{ r: 0, c: 0 }],
    };
    const state = initPlacementState([placed]);
    expect(state.ships[0].placed).toBe(false);
    expect(state.ships[0].positions).toEqual([]);
  });

  it("starts with a blank 8×8 grid", () => {
    const state = makeState();
    expect(state.grid).toHaveLength(8);
    expect(state.grid[0][0]).toBe("empty");
  });
});

describe("SELECT", () => {
  it("updates selectedShipId for a known ship", () => {
    const state = makeState([makeShip("a"), makeShip("b")]);
    const next = placementReducer(state, { type: "SELECT", shipId: "b" });
    expect(next.selectedShipId).toBe("b");
  });

  it("is a no-op for an unknown shipId", () => {
    const state = makeState();
    const next = placementReducer(state, { type: "SELECT", shipId: "unknown" });
    expect(next).toBe(state);
  });
});

describe("ROTATE", () => {
  it("toggles orientation from horizontal to vertical", () => {
    const state = makeState();
    expect(state.orientation).toBe("horizontal");
    const next = placementReducer(state, { type: "ROTATE" });
    expect(next.orientation).toBe("vertical");
  });

  it("toggles back to horizontal on a second ROTATE", () => {
    let state = makeState();
    state = placementReducer(state, { type: "ROTATE" });
    state = placementReducer(state, { type: "ROTATE" });
    expect(state.orientation).toBe("horizontal");
  });
});

describe("PLACE", () => {
  it("places the selected ship on a valid cell", () => {
    const state = makeState([makeShip("s1", 2)]);
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    expect(next.ships[0].placed).toBe(true);
    expect(next.grid[0][0]).toBe("ship");
    expect(next.grid[0][1]).toBe("ship");
  });

  it("advances selectedShipId to the next unplaced ship", () => {
    const state = makeState([makeShip("s1", 1), makeShip("s2", 1)]);
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    expect(next.selectedShipId).toBe("s2");
  });

  it("sets selectedShipId to null once all ships are placed", () => {
    const state = makeState([makeShip("s1", 1)]);
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    expect(next.selectedShipId).toBeNull();
  });

  it("is a no-op when placement would go out of bounds", () => {
    const state = makeState([makeShip("s1", 3)]);
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 7 }); // 3-cell ship at col 7 is OOB
    expect(next.ships[0].placed).toBe(false);
  });

  it("is a no-op when placement would collide with an existing ship", () => {
    let state = makeState([makeShip("s1", 1), makeShip("s2", 1)]);
    state = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 0 }); // collision
    expect(next.ships[1].placed).toBe(false);
  });

  it("is a no-op when no ship is selected", () => {
    let state = makeState([makeShip("s1", 1)]);
    state = { ...state, selectedShipId: null };
    const next = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    expect(next).toBe(state);
  });
});

describe("REMOVE", () => {
  it("unplaces the ship and clears its cells from the grid", () => {
    let state = makeState([makeShip("s1", 1)]);
    state = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    const next = placementReducer(state, { type: "REMOVE", shipId: "s1" });
    expect(next.ships[0].placed).toBe(false);
    expect(next.grid[0][0]).toBe("empty");
  });

  it("is a no-op for a ship that is not placed", () => {
    const state = makeState([makeShip("s1", 1)]);
    const next = placementReducer(state, { type: "REMOVE", shipId: "s1" });
    expect(next).toBe(state);
  });
});

describe("RESET", () => {
  it("clears all ships and resets the grid", () => {
    let state = makeState([makeShip("s1", 1)]);
    state = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    const next = placementReducer(state, { type: "RESET" });
    expect(next.ships[0].placed).toBe(false);
    expect(next.grid[0][0]).toBe("empty");
  });
});

describe("allShipsPlaced", () => {
  it("returns true when every ship is placed", () => {
    let state = makeState([makeShip("s1", 1)]);
    state = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    expect(allShipsPlaced(state)).toBe(true);
  });

  it("returns false while any ship is unplaced", () => {
    expect(allShipsPlaced(makeState([makeShip("s1", 1)]))).toBe(false);
  });

  it("returns false for an empty fleet", () => {
    expect(allShipsPlaced(initPlacementState([]))).toBe(false);
  });
});

describe("canPreviewPlacement", () => {
  it("returns true for a valid cell with the selected ship", () => {
    const state = makeState([makeShip("s1", 1)]);
    expect(canPreviewPlacement(state, 0, 0)).toBe(true);
  });

  it("returns false when no ship is selected", () => {
    const state = { ...makeState([makeShip("s1", 1)]), selectedShipId: null };
    expect(canPreviewPlacement(state, 0, 0)).toBe(false);
  });

  it("returns false when the selected ship is already placed", () => {
    let state = makeState([makeShip("s1", 1)]);
    state = placementReducer(state, { type: "PLACE", r: 0, c: 0 });
    state = { ...state, selectedShipId: "s1" };
    expect(canPreviewPlacement(state, 3, 3)).toBe(false);
  });
});
