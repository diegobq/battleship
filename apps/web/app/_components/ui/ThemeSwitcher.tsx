"use client";
import { useTheme, Theme } from "@/lib/ui/useTheme";

const LABELS: Record<Theme, string> = {
  default: "Default",
  dark: "🌑 Dark",
  christmas: "🎄 Christmas",
};

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      aria-label="Select theme"
      style={{
        background: "var(--surface-muted)",
        color: "var(--surface-fg)",
        border: "1px solid var(--board-grid-line)",
        borderRadius: "var(--radius-sm)",
        padding: "0.25rem 0.5rem",
        fontSize: "0.875rem",
        cursor: "pointer",
      }}
    >
      {themes.map((t) => (
        <option key={t} value={t}>
          {LABELS[t]}
        </option>
      ))}
    </select>
  );
}
