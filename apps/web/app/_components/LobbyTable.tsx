"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LobbyGameDto } from "@battleship/core";
import { setPlayerId } from "@/lib/ui/playerSession";

export default function LobbyTable() {
  const router = useRouter();
  const [games, setGames] = useState<LobbyGameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/games/stream");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { games: LobbyGameDto[] };
        setGames(data.games ?? []);
        setLoading(false);
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => setLoading(false);
    return () => es.close();
  }, []);

  async function handleJoin(gameId: string) {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError("Enter your name first.");
      return;
    }
    setJoining(gameId);
    setError(null);
    try {
      const r = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, playerName: trimmed }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Join failed (${r.status}).`);
      }
      const { playerId } = await r.json();
      setPlayerId(gameId, playerId);
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError((e as Error).message);
      setJoining(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 w-full">
      <h2 className="text-xl font-semibold">Open lobbies</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-80">Your name</span>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={32}
          placeholder="e.g. Admiral Hopper"
          className="rounded px-3 py-2 bg-[var(--surface-muted)] border border-[var(--surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
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
      {loading ? (
        <p className="opacity-70 text-sm">Loading lobbies…</p>
      ) : games.length === 0 ? (
        <p className="opacity-70 text-sm">No open games yet — create one!</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((g) => (
            <li
              key={g.id}
              className="rounded border border-[var(--surface-elevated)] bg-[var(--surface-muted)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {g.gameName ?? `${g.hostName}'s game`}
                </span>
                <span className="text-xs opacity-70">
                  Host: {g.hostName} · Mode: {g.mode} · Timer:{" "}
                  {Math.round(g.turnTimerMs / 1000)}s · ID: {g.id}
                </span>
              </div>
              <button
                onClick={() => handleJoin(g.id)}
                disabled={joining !== null}
                className="rounded px-4 py-2 font-semibold disabled:opacity-50"
                style={{
                  background: "var(--brand-primary)",
                  color: "var(--surface-fg)",
                }}
              >
                {joining === g.id ? "Joining…" : "Join"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
