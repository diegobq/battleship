import {
  BoardCellStatus,
  GameState,
  Ship,
  ShipOrientation,
  ShipPlacement,
  ShipType,
} from "@battleship/core";

// --- WebSocket ---

export type WsConnectionState =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

// --- Game context ---

export interface ShotEvent {
  shooterId: string;
  r: number;
  c: number;
  hit: boolean;
  sunkShipType?: ShipType;
  scoreAwarded: number;
  cellStatus: "hit" | "miss";
  at: number;
}

export interface GameContextValue {
  state: GameState | null;
  gameId: string;
  playerId: string;
  connection: "connecting" | "open" | "closed" | "error";
  lastShot: ShotEvent | null;
  turnExpiredPlayerId: string | null;
  errorMessage: string | null;
  placeFleet: (placements: ShipPlacement[]) => boolean;
  shoot: (r: number, c: number) => boolean;
  leaveGame: () => boolean;
  dismissError: () => void;
}

// --- Placement ---

export interface PlacementState {
  grid: BoardCellStatus[][];
  ships: Ship[];
  selectedShipId: string | null;
  orientation: ShipOrientation;
}

export type PlacementAction =
  | { type: "SELECT"; shipId: string }
  | { type: "ROTATE" }
  | { type: "PLACE"; r: number; c: number }
  | { type: "REMOVE"; shipId: string }
  | { type: "RESET" };
