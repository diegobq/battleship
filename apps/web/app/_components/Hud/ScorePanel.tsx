"use client";
import { GameState } from "@battleship/core";

export interface ScorePanelProps {
  state: GameState;
  selfId: string;
}

export default function ScorePanel({ state, selfId }: ScorePanelProps) {
  const ids = Object.keys(state.players);
  const opponentId = ids.find((id) => id !== selfId);
  const self = state.players[selfId];
  const opponent = opponentId ? state.players[opponentId] : null;
  return (
    <div className="flex gap-3" aria-label="Scoreboard">
      <ScoreBox
        name={self.name}
        score={self.score}
        active={state.activePlayerId === selfId}
        mine
      />
      {opponent && (
        <ScoreBox
          name={opponent.name}
          score={opponent.score}
          active={state.activePlayerId === opponent.id}
        />
      )}
    </div>
  );
}

function ScoreBox({
  name,
  score,
  active,
  mine = false,
}: {
  name: string;
  score: number;
  active: boolean;
  mine?: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-md p-3 flex flex-col gap-1"
      style={{
        background: "var(--hud-bg)",
        border: active
          ? "2px solid var(--brand-success)"
          : "2px solid transparent",
      }}
    >
      <span className="text-xs opacity-70">{mine ? "You" : "Opponent"}</span>
      <span className="font-semibold text-sm truncate">{name}</span>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: "var(--hud-score)" }}
      >
        {score}
      </span>
    </div>
  );
}
