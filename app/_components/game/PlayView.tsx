'use client';
import { useGame } from '@/lib/ui/GameProvider';
import Board from '../Board/Board';
import ShotToast from '../Effects/ShotToast';
import MultiplierBadge from '../Hud/MultiplierBadge';
import ScorePanel from '../Hud/ScorePanel';
import TurnTimer from '../Hud/TurnTimer';

export default function PlayView() {
  const { state, playerId, lastShot, shoot } = useGame();
  if (!state) return <p className="p-4">Loading…</p>;
  const me = state.players[playerId];
  const opponentId = Object.keys(state.players).find((id) => id !== playerId);
  const opponent = opponentId ? state.players[opponentId] : null;
  const isMyTurn = state.activePlayerId === playerId;
  const finished = state.status === 'finished';
  const iWon = finished && state.winnerId === playerId;

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-4 flex flex-col gap-4">
      <ShotToast event={lastShot} selfId={playerId} />

      <ScorePanel state={state} selfId={playerId} />
      <div className="flex gap-2 items-center">
        <TurnTimer
          deadlineAt={state.turnDeadlineAt}
          totalMs={state.config.turnTimerMs}
          isMyTurn={isMyTurn}
        />
        <MultiplierBadge
          mode={state.config.mode}
          consecutiveHits={me.consecutiveHits}
          eliteConfig={state.config.elite}
        />
      </div>

      {finished && (
        <div
          role="status"
          className="rounded-md p-4 text-center font-semibold"
          style={{
            background: iWon ? 'var(--brand-success)' : 'var(--brand-danger)',
            color: 'var(--surface-bg)',
          }}
        >
          {iWon ? '🏆 Victory! Fleet destroyed.' : '💀 Defeat. Your fleet sunk.'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section>
          <h2 className="text-sm uppercase opacity-70 mb-2">My board</h2>
          <Board grid={me.grid} showShips disabled />
        </section>
        <section>
          <h2 className="text-sm uppercase opacity-70 mb-2">Enemy board</h2>
          {opponent && (
            <Board
              grid={opponent.grid}
              showShips={finished}
              disabled={!isMyTurn || finished}
              onCellClick={(r, c) => shoot(r, c)}
            />
          )}
        </section>
      </div>
    </main>
  );
}
