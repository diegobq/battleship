"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameMode } from "@battleship/core";
import { setPlayerId } from "@/lib/ui/playerSession";

const MODES: { value: GameMode; label: string; description: string }[] = [
  {
    value: "Classic",
    label: "Classic",
    description: "1 point per hit. No bonuses, no penalties.",
  },
  {
    value: "Risk",
    label: "Risk",
    description: "10 points per hit, −1 per miss. Floor at 0.",
  },
  {
    value: "Elite",
    label: "Elite",
    description:
      "Full scoring: accuracy bonus, streak multipliers, reflex bonus, miss penalty.",
  },
];

export default function NewGamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState<GameMode>("Classic");
  const [cruiser, setCruiser] = useState(1);
  const [destroyer, setDestroyer] = useState(1);
  const [submarine, setSubmarine] = useState(1);
  const [turnTimerSec, setTurnTimerSec] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Enter your name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          playerName: playerName.trim(),
          fleet: {
            Cruiser: cruiser,
            Destroyer: destroyer,
            Submarine: submarine,
          },
          turnTimerMs: turnTimerSec * 1000,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Create failed (${r.status}).`);
      }
      const { gameId, playerId } = await r.json();
      setPlayerId(gameId, playerId);
      router.push(`/game/${gameId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm opacity-70 hover:opacity-100">
        ← Back to lobby
      </Link>
      <h1 className="text-3xl font-bold mt-3 mb-6">Create new game</h1>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-80">Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={32}
            placeholder="e.g. Captain Turing"
            className="rounded px-3 py-2 bg-[var(--surface-muted)] border border-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="opacity-80 text-sm mb-1">Game mode</legend>
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex flex-col gap-1 rounded border p-3 cursor-pointer ${mode === m.value ? "border-[var(--brand-primary)]" : "border-[var(--surface-elevated)]"}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                />
                <span className="font-medium">{m.label}</span>
              </span>
              <span className="text-xs opacity-70 pl-6">{m.description}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="opacity-80 text-sm mb-1">
            Fleet (ships per type)
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <FleetCount
              label="Cruiser (3-cell)"
              value={cruiser}
              setValue={setCruiser}
            />
            <FleetCount
              label="Destroyer (2-cell)"
              value={destroyer}
              setValue={setDestroyer}
            />
            <FleetCount
              label="Submarine (1-cell)"
              value={submarine}
              setValue={setSubmarine}
            />
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-80">Turn timer: {turnTimerSec}s</span>
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={turnTimerSec}
            onChange={(e) => setTurnTimerSec(Number(e.target.value))}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="text-sm"
            style={{ color: "var(--brand-danger)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded px-5 py-3 font-semibold disabled:opacity-50"
          style={{
            background: "var(--brand-primary)",
            color: "var(--surface-fg)",
          }}
        >
          {busy ? "Creating…" : "Create game"}
        </button>
      </form>
    </main>
  );
}

function FleetCount({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="opacity-80">{label}</span>
      <input
        type="number"
        min={0}
        max={10}
        value={value}
        onChange={(e) =>
          setValue(Math.max(0, Math.min(10, Number(e.target.value) || 0)))
        }
        className="rounded px-2 py-1 bg-[var(--surface-muted)] border border-[var(--surface-elevated)]"
      />
    </label>
  );
}
