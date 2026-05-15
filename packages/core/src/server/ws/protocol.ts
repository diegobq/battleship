import { ShipPlacement } from "../../core/game";
import { GameState, ShipType } from "../../core/types";

export type ClientMessage =
  | { type: "PLACE_FLEET"; payload: { placements: ShipPlacement[] } }
  | { type: "SHOOT"; payload: { r: number; c: number } }
  | { type: "LEAVE_GAME" }
  | { type: "PING" };

export interface ShotResultDto {
  shooterId: string;
  r: number;
  c: number;
  hit: boolean;
  sunkShipType?: ShipType;
  scoreAwarded: number;
  cellStatus: "hit" | "miss";
}

export type ServerMessage =
  | { type: "GAME_STATE_UPDATE"; payload: { state: GameState } }
  | { type: "SHOT_RESULT"; payload: ShotResultDto }
  | { type: "TURN_TIMEOUT"; payload: { playerId: string } }
  | { type: "ERROR"; payload: { code: string; message: string } }
  | { type: "PONG" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isShipPlacement(v: unknown): v is ShipPlacement {
  if (!isRecord(v)) return false;
  return (
    typeof v.shipId === "string" &&
    typeof v.r === "number" &&
    Number.isInteger(v.r) &&
    typeof v.c === "number" &&
    Number.isInteger(v.c) &&
    (v.orientation === "horizontal" || v.orientation === "vertical")
  );
}

export function parseClientMessage(raw: string): ClientMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON.");
  }
  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error("Message must be an object with a type field.");
  }
  switch (parsed.type) {
    case "PLACE_FLEET":
      return parsePlaceFleet(parsed.payload);
    case "SHOOT":
      return parseShoot(parsed.payload);
    case "LEAVE_GAME":
      return { type: "LEAVE_GAME" };
    case "PING":
      return { type: "PING" };
    default:
      throw new Error(`Unknown message type: ${parsed.type}.`);
  }
}

function parsePlaceFleet(payload: unknown): ClientMessage {
  if (!isRecord(payload) || !Array.isArray(payload.placements)) {
    throw new Error("PLACE_FLEET payload must contain a 'placements' array.");
  }
  if (!payload.placements.every(isShipPlacement)) {
    throw new Error("Invalid placement entry in PLACE_FLEET payload.");
  }
  return {
    type: "PLACE_FLEET",
    payload: { placements: payload.placements as ShipPlacement[] },
  };
}

function parseShoot(payload: unknown): ClientMessage {
  if (
    !isRecord(payload) ||
    typeof payload.r !== "number" ||
    typeof payload.c !== "number"
  ) {
    throw new Error("SHOOT payload must contain numeric 'r' and 'c' fields.");
  }
  if (!Number.isInteger(payload.r) || !Number.isInteger(payload.c)) {
    throw new Error("SHOOT 'r' and 'c' must be integers.");
  }
  return { type: "SHOOT", payload: { r: payload.r, c: payload.c } };
}

export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function sanitizeGameStateFor(
  state: GameState,
  viewerId: string,
): GameState {
  const players = { ...state.players };
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid === viewerId) continue;
    players[pid] = {
      ...p,
      grid: p.grid.map((row) =>
        row.map((cell) => (cell === "ship" ? "empty" : cell)),
      ),
      ships: p.ships.map((s) => ({
        ...s,
        // Reveal positions only once the ship is fully sunk (victory-screen rule).
        positions: s.hits >= s.length ? s.positions : [],
      })),
    };
  }
  return { ...state, players };
}
