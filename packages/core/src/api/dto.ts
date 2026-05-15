import { FleetConfig, GameMode, ShipType } from "../core/types";
import { ApiError } from "./api-error";

const ALLOWED_MODES: readonly GameMode[] = ["Elite", "Classic", "Risk"];
const ALLOWED_SHIP_TYPES: readonly ShipType[] = [
  "Cruiser",
  "Destroyer",
  "Submarine",
];

const MAX_PLAYER_NAME = 32;
const MAX_GAME_NAME = 64;
const MAX_GAME_ID = 64;
const MAX_FLEET_COUNT_PER_TYPE = 10;
const MIN_TURN_TIMER_MS = 5_000;
const MAX_TURN_TIMER_MS = 600_000;

export interface CreateGameRequest {
  mode: GameMode;
  playerName: string;
  gameName?: string;
  fleet?: FleetConfig;
  turnTimerMs?: number;
}

export interface JoinGameRequest {
  gameId: string;
  playerName: string;
}

export interface LobbyGameDto {
  id: string;
  hostName: string;
  gameName?: string;
  mode: GameMode;
  fleet: FleetConfig;
  turnTimerMs: number;
  createdAt: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  max: number,
): string {
  const v = record[key];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `'${key}' is required and must be a non-empty string.`,
    );
  }
  const trimmed = v.trim();
  if (trimmed.length > max) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `'${key}' must be at most ${max} characters.`,
    );
  }
  return trimmed;
}

export function parseCreateGameRequest(body: unknown): CreateGameRequest {
  if (!isRecord(body)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Request body must be a JSON object.",
    );
  }
  const playerName = requireString(body, "playerName", MAX_PLAYER_NAME);
  const mode = requireString(body, "mode", 16);
  if (!ALLOWED_MODES.includes(mode as GameMode)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `'mode' must be one of: ${ALLOWED_MODES.join(", ")}.`,
    );
  }
  return {
    mode: mode as GameMode,
    playerName,
    gameName: parseOptionalString(body.gameName, "gameName", MAX_GAME_NAME),
    fleet: parseFleet(body.fleet),
    turnTimerMs: parseTurnTimerMs(body.turnTimerMs),
  };
}

function parseOptionalString(
  raw: unknown,
  key: string,
  max: number,
): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string" || raw.trim().length === 0) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > max) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `'${key}' must be at most ${max} characters.`,
    );
  }
  return trimmed;
}

function parseFleet(raw: unknown): FleetConfig | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "'fleet' must be an object mapping ship types to counts.",
    );
  }
  const out: FleetConfig = {};
  let total = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_SHIP_TYPES.includes(k as ShipType)) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `Unknown ship type in fleet: '${k}'.`,
      );
    }
    if (
      typeof v !== "number" ||
      !Number.isInteger(v) ||
      v < 0 ||
      v > MAX_FLEET_COUNT_PER_TYPE
    ) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `Fleet count for '${k}' must be an integer between 0 and ${MAX_FLEET_COUNT_PER_TYPE}.`,
      );
    }
    out[k as ShipType] = v;
    total += v;
  }
  if (total === 0) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "'fleet' must contain at least one ship.",
    );
  }
  return out;
}

function parseTurnTimerMs(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (
    typeof raw !== "number" ||
    !Number.isFinite(raw) ||
    raw < MIN_TURN_TIMER_MS ||
    raw > MAX_TURN_TIMER_MS
  ) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `'turnTimerMs' must be a number between ${MIN_TURN_TIMER_MS} and ${MAX_TURN_TIMER_MS}.`,
    );
  }
  return raw;
}

export function parseJoinGameRequest(body: unknown): JoinGameRequest {
  if (!isRecord(body)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Request body must be a JSON object.",
    );
  }
  return {
    gameId: requireString(body, "gameId", MAX_GAME_ID),
    playerName: requireString(body, "playerName", MAX_PLAYER_NAME),
  };
}
