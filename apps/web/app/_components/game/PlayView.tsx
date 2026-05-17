"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { PlayerState } from "@battleship/core";
import { useGame } from "@/lib/ui/GameProvider";
import { useShotAnnouncement } from "@/lib/ui/useShotAnnouncement";
import { useShotFeedback } from "@/lib/ui/useShotFeedback";
import { useOptimisticShots } from "@/lib/ui/useOptimisticShots";
import Board from "../Board/Board";
import ShotToast from "../Effects/ShotToast";
import MultiplierBadge from "../Hud/MultiplierBadge";
import ScorePanel from "../Hud/ScorePanel";
import TurnTimer from "../Hud/TurnTimer";
import { LiveRegion } from "../ui/LiveRegion";
import { SfxToggle } from "../ui/SfxToggle";

export default function PlayView() {
  const { state, playerId, lastShot, shoot, leaveGame } = useGame();
  const sentences = useShotAnnouncement(lastShot, playerId);
  const { onShot, onTurnStart } = useShotFeedback();
  const { pending, addPending, reconcile } = useOptimisticShots();
  const prevActiveIdRef = useRef<string | undefined>(undefined);
  const activePlayerId = state?.activePlayerId ?? undefined;

  useEffect(() => {
    if (!lastShot) return;
    onShot({ hit: lastShot.hit, sunk: !!lastShot.sunkShipType });
    reconcile(lastShot.r, lastShot.c);
  }, [lastShot, onShot, reconcile]);

  useEffect(() => {
    if (prevActiveIdRef.current !== undefined && activePlayerId === playerId) {
      onTurnStart();
    }
    prevActiveIdRef.current = activePlayerId;
  }, [activePlayerId, playerId, onTurnStart]);

  if (!state) return <p className="p-4">Loading…</p>;
  const me = state.players[playerId];
  const opponentId = Object.keys(state.players).find((id) => id !== playerId);
  const opponent = opponentId ? state.players[opponentId] : null;
  const isMyTurn = state.activePlayerId === playerId;
  const finished = state.status === "finished";
  const iWon = finished && state.winnerId === playerId;

  function handleShoot(r: number, c: number) {
    addPending(r, c);
    return shoot(r, c);
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-4 flex flex-col gap-4">
      <LiveRegion sentences={sentences} />
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
        <div className="ml-auto flex gap-2 items-center">
          <SfxToggle />
          <Link
            href="/"
            onClick={finished ? undefined : leaveGame}
            className="rounded px-3 py-2 text-sm"
            style={{
              background: "var(--surface-muted)",
              color: "var(--brand-danger)",
            }}
          >
            {finished ? "Back to lobby" : "Leave game"}
          </Link>
        </div>
      </div>
      <GameResultBanner finished={finished} iWon={iWon} />
      <BoardsSection
        me={me}
        opponent={opponent}
        isMyTurn={isMyTurn}
        finished={finished}
        pendingCells={pending}
        onShoot={handleShoot}
      />
    </main>
  );
}

function GameResultBanner({
  finished,
  iWon,
}: {
  finished: boolean;
  iWon: boolean;
}) {
  if (!finished) return null;
  return (
    <div
      role="status"
      className="rounded-md p-4 text-center font-semibold"
      style={{
        background: iWon ? "var(--brand-success)" : "var(--brand-danger)",
        color: "var(--surface-bg)",
      }}
    >
      {iWon ? "🏆 Victory! Fleet destroyed." : "💀 Defeat. Your fleet sunk."}
    </div>
  );
}

function BoardsSection({
  me,
  opponent,
  isMyTurn,
  finished,
  pendingCells,
  onShoot,
}: {
  me: PlayerState;
  opponent: PlayerState | null;
  isMyTurn: boolean;
  finished: boolean;
  pendingCells: Set<string>;
  onShoot: (r: number, c: number) => boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <section>
        <h2 className="text-sm uppercase opacity-70 mb-2">{me.name}</h2>
        <Board grid={me.grid} showShips disabled />
      </section>
      <section>
        <h2 className="text-sm uppercase opacity-70 mb-2">
          {opponent?.name ?? "Waiting…"}
        </h2>
        {opponent && (
          <Board
            grid={opponent.grid}
            showShips={finished}
            disabled={!isMyTurn || finished}
            pendingCells={pendingCells}
            onCellClick={(r, c) => onShoot(r, c)}
          />
        )}
      </section>
    </div>
  );
}
