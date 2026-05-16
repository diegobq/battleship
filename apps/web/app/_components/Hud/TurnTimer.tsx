"use client";
import { useEffect, useState } from "react";

export interface TurnTimerProps {
  deadlineAt: number | null;
  totalMs: number;
  isMyTurn: boolean;
}

export default function TurnTimer({
  deadlineAt,
  totalMs,
  isMyTurn,
}: TurnTimerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!deadlineAt) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [deadlineAt]);

  if (!deadlineAt) {
    return null;
  }
  const remaining = Math.max(0, deadlineAt - now);
  const seconds = Math.ceil(remaining / 1_000);
  const pct =
    totalMs > 0 ? Math.max(0, Math.min(100, (remaining / totalMs) * 100)) : 0;
  return (
    <div
      className="flex items-center gap-2 rounded-md px-3 py-2"
      style={{ background: "var(--hud-bg)" }}
    >
      <span className="text-xs opacity-70">
        {isMyTurn ? "Your turn" : "Opponent"}
      </span>
      <span
        className="font-bold tabular-nums text-lg"
        style={{ color: "var(--hud-timer)" }}
      >
        {seconds}s
      </span>
      <span className="flex-1 h-1 rounded bg-[var(--surface-elevated)] overflow-hidden">
        <span
          className="block h-full transition-[width] duration-200"
          style={{ width: `${pct}%`, background: "var(--hud-timer)" }}
        />
      </span>
    </div>
  );
}
