"use client";
import {
  DEFAULT_ELITE_CONFIG,
  getConsecutiveHitMultiplier,
} from "@battleship/core";
import { EliteConfig, GameMode } from "@battleship/core";

export interface MultiplierBadgeProps {
  mode: GameMode;
  consecutiveHits: number;
  eliteConfig?: Partial<EliteConfig>;
}

export default function MultiplierBadge({
  mode,
  consecutiveHits,
  eliteConfig,
}: MultiplierBadgeProps) {
  if (mode !== "Elite") return null;
  const multipliers =
    eliteConfig?.multipliers ?? DEFAULT_ELITE_CONFIG.multipliers;
  const x = getConsecutiveHitMultiplier(consecutiveHits, multipliers);
  if (x <= 1) return null;
  return (
    <div
      className="rounded-md px-3 py-2 font-bold tabular-nums"
      style={{ background: "var(--hud-bg)", color: "var(--hud-multiplier)" }}
      aria-label={`Streak multiplier ${x}x`}
    >
      ×{x} streak
    </div>
  );
}
