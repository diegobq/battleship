"use client";
import { useSfx } from "@/lib/ui/useSfx";

export function SfxToggle() {
  const { sfxEnabled, toggleSfx } = useSfx();
  return (
    <button
      onClick={toggleSfx}
      aria-label={sfxEnabled ? "Mute sound effects" : "Unmute sound effects"}
      aria-pressed={!sfxEnabled}
      style={{
        background: "var(--surface-muted)",
        color: "var(--surface-fg)",
        border: "1px solid var(--board-grid-line)",
        borderRadius: "var(--radius-sm)",
        padding: "0.25rem 0.5rem",
        fontSize: "1rem",
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {sfxEnabled ? "🔊" : "🔇"}
    </button>
  );
}
