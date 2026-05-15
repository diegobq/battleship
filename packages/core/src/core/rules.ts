import { areAllShipsSunk, isInBounds } from "./board";
import { Rng } from "./rng";
import { GameMode, GameState, Ship } from "./types";

export class GameRuleError extends Error {
  constructor(
    public readonly code:
      | "NOT_PLAYING"
      | "WRONG_TURN"
      | "OUT_OF_BOUNDS"
      | "ALREADY_SHOT"
      | "UNKNOWN_PLAYER"
      | "INVALID_PLAYER_COUNT",
    message: string,
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export function getOpponentId(game: GameState, playerId: string): string {
  const ids = Object.keys(game.players);
  if (ids.length !== 2) {
    throw new GameRuleError(
      "INVALID_PLAYER_COUNT",
      `Game must have 2 players, has ${ids.length}.`,
    );
  }
  if (!ids.includes(playerId)) {
    throw new GameRuleError("UNKNOWN_PLAYER", `Unknown player: ${playerId}.`);
  }
  return ids[0] === playerId ? ids[1] : ids[0];
}

// Turn alternates after every shot regardless of hit or miss — documented design choice.
export const nextActivePlayer = getOpponentId;

export function decideFirstPlayer(
  rng: Rng,
  playerIds: readonly string[],
): string {
  if (playerIds.length === 0) {
    throw new GameRuleError(
      "INVALID_PLAYER_COUNT",
      "Cannot decide first player from empty list.",
    );
  }
  const idx = Math.floor(rng.next() * playerIds.length);
  return playerIds[idx];
}

export function validateShot(
  game: GameState,
  shooterId: string,
  r: number,
  c: number,
): void {
  if (game.status !== "playing") {
    throw new GameRuleError(
      "NOT_PLAYING",
      `Game is not in playing state (status=${game.status}).`,
    );
  }
  if (game.activePlayerId !== shooterId) {
    throw new GameRuleError("WRONG_TURN", `Not ${shooterId}'s turn.`);
  }
  const opponentId = getOpponentId(game, shooterId);
  const opponentGrid = game.players[opponentId].grid;
  if (!isInBounds(r, c, opponentGrid.length)) {
    throw new GameRuleError(
      "OUT_OF_BOUNDS",
      `Shot out of bounds: (${r}, ${c}).`,
    );
  }
  const cell = opponentGrid[r][c];
  if (cell === "hit" || cell === "miss") {
    throw new GameRuleError(
      "ALREADY_SHOT",
      `Cell (${r}, ${c}) was already shot.`,
    );
  }
}

export function isGameOver(opponentShips: Ship[]): boolean {
  return areAllShipsSunk(opponentShips);
}

// ─── Win Condition Strategy ───────────────────────────────────────────────────
// Extension point: implement this interface to add a custom win condition.

export interface WinConditionStrategy {
  isGameOver(opponentShips: Ship[], state: GameState): boolean;
}

export const allShipsSunkCondition: WinConditionStrategy = {
  isGameOver: (ships) => areAllShipsSunk(ships),
};

export function resolveWinCondition(mode: GameMode): WinConditionStrategy {
  switch (mode) {
    case "Classic":
    case "Risk":
    case "Elite":
      return allShipsSunkCondition;
  }
}

// ─── Turn Strategy ────────────────────────────────────────────────────────────
// Extension point: implement this interface to change turn progression rules.

export interface TurnStrategy {
  nextPlayer(game: GameState, shooterId: string, hit: boolean): string;
}

export const alternatingTurnStrategy: TurnStrategy = {
  nextPlayer: (game, shooterId) => getOpponentId(game, shooterId),
};

// Variant: shooter keeps the turn on a hit (common Battleship rule variant).
export const hitKeepsTurnStrategy: TurnStrategy = {
  nextPlayer: (game, shooterId, hit) =>
    hit ? shooterId : getOpponentId(game, shooterId),
};

export function resolveTurnStrategy(mode: GameMode): TurnStrategy {
  switch (mode) {
    case "Classic":
    case "Risk":
    case "Elite":
      return alternatingTurnStrategy;
  }
}
