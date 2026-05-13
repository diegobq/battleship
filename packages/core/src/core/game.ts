import { applyShot, areAllShipsPlaced, createEmptyGrid, countHiddenCells, applyPlacement } from './board';
import { Clock } from './clock';
import { buildFleet } from './fleet';
import { Rng } from './rng';
import { GameRuleError, decideFirstPlayer, getOpponentId, isGameOver, validateShot } from './rules';
import { awardScore } from './scoring';
import {
  Coordinate,
  GameConfig,
  GameState,
  PlayerState,
  Ship,
  ShipOrientation,
  ShipType,
  ShotResult,
} from './types';

export interface ShipPlacement {
  shipId: string;
  r: number;
  c: number;
  orientation: ShipOrientation;
}

export function createPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    grid: createEmptyGrid(),
    ships: [],
    score: 0,
    consecutiveHits: 0,
    ready: false,
  };
}

export function createGame(opts: {
  id: string;
  config: GameConfig;
  host: PlayerState;
  clock: Clock;
}): GameState {
  const now = opts.clock.now();
  return {
    id: opts.id,
    status: 'lobby',
    config: opts.config,
    players: { [opts.host.id]: opts.host },
    activePlayerId: null,
    lastActionTime: now,
    createdAt: now,
    turnDeadlineAt: null,
    winnerId: null,
  };
}

export function addSecondPlayer(
  game: GameState,
  joiner: PlayerState,
  deps: { idFactory: () => string },
): GameState {
  if (game.status !== 'lobby') {
    throw new GameRuleError('NOT_PLAYING', `Cannot join: game status is ${game.status}.`);
  }
  if (Object.keys(game.players).length >= 2) {
    throw new GameRuleError('INVALID_PLAYER_COUNT', 'Game already has two players.');
  }
  const [hostId] = Object.keys(game.players);
  const host = { ...game.players[hostId], ships: buildFleet(game.config.fleet, deps.idFactory) };
  const second = { ...joiner, ships: buildFleet(game.config.fleet, deps.idFactory) };
  return {
    ...game,
    status: 'placement',
    players: { [hostId]: host, [second.id]: second },
  };
}

export function placeFleet(
  game: GameState,
  playerId: string,
  placements: readonly ShipPlacement[],
  deps: { clock: Clock; rng: Rng },
): GameState {
  if (game.status !== 'placement') {
    throw new GameRuleError('NOT_PLAYING', `Cannot place: game status is ${game.status}.`);
  }
  const player = game.players[playerId];
  if (!player) {
    throw new GameRuleError('UNKNOWN_PLAYER', `Unknown player: ${playerId}.`);
  }
  const placed = buildPlacedFleet(player.ships, placements);
  const updatedPlayer: PlayerState = { ...player, grid: placed.grid, ships: placed.ships, ready: true };
  const players = { ...game.players, [playerId]: updatedPlayer };
  const allReady =
    Object.keys(players).length === 2 &&
    Object.values(players).every((p) => p.ready && areAllShipsPlaced(p.ships));
  const next: GameState = { ...game, players };
  return allReady ? startPlaying(next, deps) : next;
}

function buildPlacedFleet(
  ships: readonly Ship[],
  placements: readonly ShipPlacement[],
): { grid: ReturnType<typeof createEmptyGrid>; ships: Ship[] } {
  if (placements.length !== ships.length) {
    throw new GameRuleError('NOT_PLAYING', `Must place all ${ships.length} ships at once.`);
  }
  const byId = new Map(ships.map((s) => [s.id, s]));
  let grid = createEmptyGrid();
  const placed: Ship[] = [];
  for (const p of placements) {
    const ship = byId.get(p.shipId);
    if (!ship) throw new GameRuleError('NOT_PLAYING', `Unknown ship id: ${p.shipId}.`);
    const result = applyPlacement(grid, ship, { r: p.r, c: p.c }, p.orientation);
    if (!result) {
      throw new GameRuleError(
        'NOT_PLAYING',
        `Cannot place ${p.shipId} at (${p.r}, ${p.c}) ${p.orientation}.`,
      );
    }
    grid = result.grid;
    placed.push(result.ship);
  }
  return { grid, ships: placed };
}

function startPlaying(game: GameState, deps: { clock: Clock; rng: Rng }): GameState {
  const firstPlayer = decideFirstPlayer(deps.rng, Object.keys(game.players));
  const now = deps.clock.now();
  return {
    ...game,
    status: 'playing',
    activePlayerId: firstPlayer,
    lastActionTime: now,
    turnDeadlineAt: now + game.config.turnTimerMs,
  };
}

export function processShot(
  game: GameState,
  shooterId: string,
  r: number,
  c: number,
  deps: { clock: Clock },
): { game: GameState; result: ShotResult } {
  validateShot(game, shooterId, r, c);
  const opponentId = getOpponentId(game, shooterId);
  const opponent = game.players[opponentId];
  const shooter = game.players[shooterId];

  const shot = applyShot(opponent.grid, r, c);
  const shipUpdate = applyHitToShips(opponent.ships, { r, c }, shot.hit);
  const timeTakenMs = deps.clock.now() - game.lastActionTime;

  const { scoreAwarded, consecutiveHits } = awardScore({
    mode: game.config.mode,
    hit: shot.hit,
    unHitShipCells: countUnHitCells(shipUpdate.ships),
    hiddenCells: countHiddenCells(shot.grid),
    previousConsecutiveHits: shooter.consecutiveHits,
    timeTakenMs,
    eliteConfig: game.config.elite,
  });

  const gameOver = isGameOver(shipUpdate.ships);
  const nextGame = applyShotResult({
    game,
    shooterId,
    opponentId,
    shooter,
    opponent,
    newOpponentGrid: shot.grid,
    newOpponentShips: shipUpdate.ships,
    scoreAwarded,
    consecutiveHits,
    gameOver,
    clock: deps.clock,
  });

  return {
    game: nextGame,
    result: {
      hit: shot.hit,
      sunkShipType: shipUpdate.sunkShipType,
      gameOver,
      scoreAwarded,
      cellStatus: shot.hit ? 'hit' : 'miss',
    },
  };
}

function applyHitToShips(
  ships: readonly Ship[],
  cell: Coordinate,
  hit: boolean,
): { ships: Ship[]; sunkShipType?: ShipType } {
  if (!hit) return { ships: [...ships] };
  let sunkShipType: ShipType | undefined;
  const updated = ships.map((s) => {
    const occupies = s.positions.some((p) => p.r === cell.r && p.c === cell.c);
    if (!occupies) return s;
    const next: Ship = { ...s, hits: s.hits + 1 };
    if (next.hits >= next.length) sunkShipType = next.type;
    return next;
  });
  return { ships: updated, sunkShipType };
}

function countUnHitCells(ships: readonly Ship[]): number {
  return ships.reduce((sum, s) => sum + Math.max(0, s.length - s.hits), 0);
}

function applyShotResult(args: {
  game: GameState;
  shooterId: string;
  opponentId: string;
  shooter: PlayerState;
  opponent: PlayerState;
  newOpponentGrid: PlayerState['grid'];
  newOpponentShips: Ship[];
  scoreAwarded: number;
  consecutiveHits: number;
  gameOver: boolean;
  clock: Clock;
}): GameState {
  const newScore = Math.max(0, args.shooter.score + args.scoreAwarded);
  const newShooter: PlayerState = {
    ...args.shooter,
    score: newScore,
    consecutiveHits: args.consecutiveHits,
  };
  const newOpponent: PlayerState = {
    ...args.opponent,
    grid: args.newOpponentGrid,
    ships: args.newOpponentShips,
  };
  const now = args.clock.now();
  return {
    ...args.game,
    players: { [args.shooterId]: newShooter, [args.opponentId]: newOpponent },
    activePlayerId: args.gameOver ? null : args.opponentId,
    lastActionTime: now,
    turnDeadlineAt: args.gameOver ? null : now + args.game.config.turnTimerMs,
    status: args.gameOver ? 'finished' : 'playing',
    winnerId: args.gameOver ? args.shooterId : null,
  };
}

export function forfeitGame(game: GameState, leavingPlayerId: string): GameState {
  if (game.status === 'finished') return game;
  const opponentId = getOpponentId(game, leavingPlayerId);
  return {
    ...game,
    status: 'finished',
    activePlayerId: null,
    turnDeadlineAt: null,
    winnerId: opponentId,
  };
}

export function handleTurnTimeout(game: GameState, deps: { clock: Clock }): GameState {
  if (game.status !== 'playing' || !game.activePlayerId) {
    throw new GameRuleError('NOT_PLAYING', 'Cannot handle turn timeout outside of play.');
  }
  const opponentId = getOpponentId(game, game.activePlayerId);
  const now = deps.clock.now();
  const expiredId = game.activePlayerId;
  return {
    ...game,
    players: {
      ...game.players,
      [expiredId]: { ...game.players[expiredId], consecutiveHits: 0 },
    },
    activePlayerId: opponentId,
    lastActionTime: now,
    turnDeadlineAt: now + game.config.turnTimerMs,
  };
}
