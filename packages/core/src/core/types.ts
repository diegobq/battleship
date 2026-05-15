export type GameMode = "Elite" | "Classic" | "Risk";

export type ShipType = "Cruiser" | "Destroyer" | "Submarine";

export type ShipOrientation = "horizontal" | "vertical";

export interface Coordinate {
  r: number; // 0 to 7 (A-H)
  c: number; // 0 to 7 (1-8)
}

export interface Ship {
  id: string;
  type: ShipType;
  length: number;
  hits: number;
  positions: Coordinate[];
  placed: boolean;
  orientation?: ShipOrientation;
}

export interface ShipDefinition {
  length: number;
  // Optional non-linear shape (relative offsets). When omitted, ship is linear
  // and orientation determines layout. Reserved for future non-linear ship types.
  cells?: readonly Coordinate[];
}

export type FleetConfig = Partial<Record<ShipType, number>>;

export interface EliteConfig {
  basePoints: number;
  accuracyBonusMax: number;
  // Index = consecutiveHits; clamped to last entry for streaks beyond the array.
  multipliers: readonly number[];
  reflexWindowMs: number;
  reflexMultiplier: number;
  missPenalty: number; // negative
}

export interface GameConfig {
  mode: GameMode;
  fleet: FleetConfig;
  turnTimerMs: number;
  boardSize?: number; // defaults to BOARD_SIZE (8) when absent
  elite?: Partial<EliteConfig>;
}

export type BoardCellStatus = "empty" | "ship" | "hit" | "miss";

export interface PlayerState {
  id: string;
  name: string;
  grid: BoardCellStatus[][];
  ships: Ship[];
  score: number;
  consecutiveHits: number;
  ready: boolean;
}

export type GameStatus = "lobby" | "placement" | "playing" | "finished";

export interface GameState {
  id: string;
  status: GameStatus;
  config: GameConfig;
  players: Record<string, PlayerState>;
  activePlayerId: string | null;
  lastActionTime: number;
  createdAt: number;
  turnDeadlineAt: number | null;
  winnerId: string | null;
}

export interface ShotResult {
  hit: boolean;
  sunkShipType?: ShipType;
  gameOver: boolean;
  scoreAwarded: number;
  cellStatus: "hit" | "miss";
}
