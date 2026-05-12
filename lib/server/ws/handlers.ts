import { Clock } from '@/lib/core/clock';
import { ShipPlacement, handleTurnTimeout, placeFleet, processShot } from '@/lib/core/game';
import { Rng } from '@/lib/core/rng';
import { GameRuleError } from '@/lib/core/rules';
import { GameState } from '@/lib/core/types';
import { GameRegistry } from '../registry';
import { TurnTimer } from '../turn-timer';
import { ClientMessage } from './protocol';
import { WebSocketHub } from './hub';

export interface HandlerDeps {
  registry: GameRegistry;
  hub: WebSocketHub;
  turnTimer: TurnTimer;
  clock: Clock;
  rng: Rng;
}

export interface HandlerContext {
  gameId: string;
  playerId: string;
}

export function handleClientMessage(
  deps: HandlerDeps,
  ctx: HandlerContext,
  msg: ClientMessage,
): void {
  switch (msg.type) {
    case 'PLACE_FLEET':
      handlePlaceFleet(deps, ctx, msg.payload.placements);
      return;
    case 'SHOOT':
      handleShoot(deps, ctx, msg.payload.r, msg.payload.c);
      return;
    case 'PING':
      deps.hub.sendTo(ctx.gameId, ctx.playerId, { type: 'PONG' });
      return;
  }
}

function handlePlaceFleet(
  deps: HandlerDeps,
  ctx: HandlerContext,
  placements: readonly ShipPlacement[],
): void {
  const next = deps.registry.update(ctx.gameId, (current) =>
    placeFleet(current, ctx.playerId, placements, { clock: deps.clock, rng: deps.rng }),
  );
  if (!next) {
    sendError(deps, ctx, 'GAME_NOT_FOUND', `Game ${ctx.gameId} not found.`);
    return;
  }
  deps.hub.broadcastState(ctx.gameId, next);
  if (next.status === 'playing' && next.activePlayerId) {
    startTurnTimer(deps, next);
  }
}

function handleShoot(deps: HandlerDeps, ctx: HandlerContext, r: number, c: number): void {
  const current = deps.registry.get(ctx.gameId);
  if (!current) {
    sendError(deps, ctx, 'GAME_NOT_FOUND', `Game ${ctx.gameId} not found.`);
    return;
  }
  let outcome: ReturnType<typeof processShot>;
  try {
    outcome = processShot(current, ctx.playerId, r, c, { clock: deps.clock });
  } catch (err) {
    handleShotError(deps, ctx, err);
    return;
  }
  deps.turnTimer.cancel(ctx.gameId);
  deps.registry.update(ctx.gameId, () => outcome.game);
  deps.hub.broadcast(ctx.gameId, () => ({
    type: 'SHOT_RESULT',
    payload: {
      shooterId: ctx.playerId,
      r,
      c,
      hit: outcome.result.hit,
      sunkShipType: outcome.result.sunkShipType,
      scoreAwarded: outcome.result.scoreAwarded,
      cellStatus: outcome.result.cellStatus,
    },
  }));
  deps.hub.broadcastState(ctx.gameId, outcome.game);
  if (!outcome.result.gameOver && outcome.game.activePlayerId) {
    startTurnTimer(deps, outcome.game);
  }
}

function startTurnTimer(deps: HandlerDeps, game: GameState): void {
  deps.turnTimer.start(game.id, game.config.turnTimerMs, () => onTurnElapsed(deps, game.id));
}

function onTurnElapsed(deps: HandlerDeps, gameId: string): void {
  const current = deps.registry.get(gameId);
  if (!current || current.status !== 'playing' || !current.activePlayerId) return;
  const expiredPlayerId = current.activePlayerId;
  const next = deps.registry.update(gameId, (g) => handleTurnTimeout(g, { clock: deps.clock }));
  if (!next) return;
  deps.hub.broadcast(gameId, () => ({
    type: 'TURN_TIMEOUT',
    payload: { playerId: expiredPlayerId },
  }));
  deps.hub.broadcastState(gameId, next);
  if (next.activePlayerId) startTurnTimer(deps, next);
}

function handleShotError(deps: HandlerDeps, ctx: HandlerContext, err: unknown): void {
  if (err instanceof GameRuleError) {
    sendError(deps, ctx, err.code, err.message);
    return;
  }
  sendError(deps, ctx, 'INTERNAL', 'Failed to process shot.');
  console.error('Shot handler error:', err);
}

function sendError(deps: HandlerDeps, ctx: HandlerContext, code: string, message: string): void {
  deps.hub.sendTo(ctx.gameId, ctx.playerId, {
    type: 'ERROR',
    payload: { code, message },
  });
}
