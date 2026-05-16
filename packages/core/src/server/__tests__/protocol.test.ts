import { describe, it, expect } from "vitest";
import { parseClientMessage, sanitizeGameStateFor } from "../ws/protocol";
import { createEmptyGrid } from "../../core/board";
import { makeFakeClock } from "../../core/clock";
import { createGame, createPlayer } from "../../core/game";
import type { GameState } from "../../core/types";

function makeGame(): GameState {
  const host = createPlayer("host", "Host");
  return createGame({
    id: "g1",
    config: { mode: "Classic", fleet: { Submarine: 1 }, turnTimerMs: 60_000 },
    host,
    clock: makeFakeClock(),
  });
}

// ─── parseClientMessage ───────────────────────────────────────────────────────

describe("parseClientMessage — PING", () => {
  it("parses a PING message", () => {
    expect(parseClientMessage(JSON.stringify({ type: "PING" }))).toEqual({ type: "PING" });
  });
});

describe("parseClientMessage — LEAVE_GAME", () => {
  it("parses a LEAVE_GAME message", () => {
    expect(parseClientMessage(JSON.stringify({ type: "LEAVE_GAME" }))).toEqual({ type: "LEAVE_GAME" });
  });
});

describe("parseClientMessage — SHOOT", () => {
  it("parses a valid SHOOT message", () => {
    const msg = parseClientMessage(JSON.stringify({ type: "SHOOT", payload: { r: 2, c: 4 } }));
    expect(msg).toEqual({ type: "SHOOT", payload: { r: 2, c: 4 } });
  });

  it("throws when SHOOT payload is missing r or c", () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "SHOOT", payload: { r: 0 } })),
    ).toThrow();
  });

  it("throws when r or c are non-integer numbers", () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "SHOOT", payload: { r: 1.5, c: 0 } })),
    ).toThrow();
  });

  it("throws when payload is not an object", () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "SHOOT", payload: "bad" })),
    ).toThrow();
  });
});

describe("parseClientMessage — PLACE_FLEET", () => {
  const placement = { shipId: "abc", r: 0, c: 0, orientation: "horizontal" };

  it("parses a valid PLACE_FLEET message", () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: "PLACE_FLEET", payload: { placements: [placement] } }),
    );
    expect(msg.type).toBe("PLACE_FLEET");
  });

  it("throws when placements is not an array", () => {
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "PLACE_FLEET", payload: { placements: placement } })),
    ).toThrow();
  });

  it("throws when a placement entry has an invalid orientation", () => {
    expect(() =>
      parseClientMessage(
        JSON.stringify({
          type: "PLACE_FLEET",
          payload: { placements: [{ ...placement, orientation: "diagonal" }] },
        }),
      ),
    ).toThrow();
  });

  it("throws when a placement entry is missing shipId", () => {
    const bad = { r: 0, c: 0, orientation: "horizontal" };
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "PLACE_FLEET", payload: { placements: [bad] } })),
    ).toThrow();
  });
});

describe("parseClientMessage — error cases", () => {
  it("throws on malformed JSON", () => {
    expect(() => parseClientMessage("{bad json}")).toThrow();
  });

  it("throws when type is missing", () => {
    expect(() => parseClientMessage(JSON.stringify({ payload: {} }))).toThrow();
  });

  it("throws for an unknown message type", () => {
    expect(() => parseClientMessage(JSON.stringify({ type: "NUKE" }))).toThrow();
  });
});

// ─── sanitizeGameStateFor ─────────────────────────────────────────────────────

describe("sanitizeGameStateFor", () => {
  it("leaves the viewer's own grid unchanged", () => {
    const state = makeGame();
    const sanitized = sanitizeGameStateFor(state, "host");
    expect(sanitized.players["host"].grid).toEqual(state.players["host"].grid);
  });

  it("redacts opponent 'ship' cells to 'empty'", () => {
    const state = makeGame();
    // Manually add a ship cell to host's grid
    const hostWithShip: GameState = {
      ...state,
      players: {
        host: {
          ...state.players["host"],
          grid: state.players["host"].grid.map((row, r) =>
            row.map((cell, c) => (r === 0 && c === 0 ? "ship" : cell)),
          ),
        },
      },
    };
    // Sanitize from guest's perspective (host is the opponent)
    // Note: guest doesn't exist in this minimal game, but sanitize only redacts players != viewerId
    const sanitized = sanitizeGameStateFor(hostWithShip, "guest");
    expect(sanitized.players["host"].grid[0][0]).toBe("empty");
  });

  it("keeps opponent 'hit' and 'miss' cells visible", () => {
    const state = makeGame();
    const modified: GameState = {
      ...state,
      players: {
        host: {
          ...state.players["host"],
          grid: state.players["host"].grid.map((row, r) =>
            row.map((cell, c) => {
              if (r === 0 && c === 0) return "hit";
              if (r === 0 && c === 1) return "miss";
              return cell;
            }),
          ),
        },
      },
    };
    const sanitized = sanitizeGameStateFor(modified, "guest");
    expect(sanitized.players["host"].grid[0][0]).toBe("hit");
    expect(sanitized.players["host"].grid[0][1]).toBe("miss");
  });

  it("hides opponent ship positions until the ship is fully sunk", () => {
    const state = makeGame();
    const withShip: GameState = {
      ...state,
      players: {
        host: {
          ...state.players["host"],
          ships: [
            {
              id: "s1",
              type: "Submarine",
              length: 1,
              hits: 0, // not sunk
              positions: [{ r: 0, c: 0 }],
              placed: true,
            },
          ],
        },
      },
    };
    const sanitized = sanitizeGameStateFor(withShip, "guest");
    expect(sanitized.players["host"].ships[0].positions).toEqual([]);
  });

  it("reveals opponent ship positions once the ship is sunk", () => {
    const state = makeGame();
    const withSunk: GameState = {
      ...state,
      players: {
        host: {
          ...state.players["host"],
          ships: [
            {
              id: "s1",
              type: "Submarine",
              length: 1,
              hits: 1, // sunk
              positions: [{ r: 0, c: 0 }],
              placed: true,
            },
          ],
        },
      },
    };
    const sanitized = sanitizeGameStateFor(withSunk, "guest");
    expect(sanitized.players["host"].ships[0].positions).toEqual([{ r: 0, c: 0 }]);
  });
});
