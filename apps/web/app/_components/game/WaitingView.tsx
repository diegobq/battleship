'use client';
import Link from 'next/link';
import { useGame } from '@/lib/ui/GameProvider';

export default function WaitingView() {
  const { state, gameId, leaveGame } = useGame();
  const playersCount = state ? Object.keys(state.players).length : 0;
  const message =
    playersCount < 2
      ? 'Waiting for an opponent to join…'
      : 'Waiting for the other player to place their fleet…';
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
      <h1 className="text-2xl font-bold">{message}</h1>
      <div
        className="rounded-md p-4 flex flex-col gap-1 items-center"
        style={{ background: 'var(--surface-muted)' }}
      >
        <span className="text-xs opacity-70">Share this game id</span>
        <span className="text-xl font-mono tracking-wide" style={{ color: 'var(--brand-secondary)' }}>
          {gameId}
        </span>
      </div>
      <div
        className="w-12 h-12 rounded-full border-4 border-transparent border-t-current animate-spin"
        style={{ color: 'var(--brand-primary)' }}
        aria-hidden
      />
      <Link
        href="/"
        onClick={playersCount >= 2 ? leaveGame : undefined}
        className="text-sm opacity-70 hover:opacity-100"
      >
        ← Back to lobby
      </Link>
    </main>
  );
}
