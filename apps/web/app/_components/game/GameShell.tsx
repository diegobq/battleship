'use client';
import { GameProvider, useGame } from '@/lib/ui/GameProvider';
import { usePlayerId } from '@/lib/ui/playerSession';
import ErrorView from './ErrorView';
import PlacementView from './PlacementView';
import PlayView from './PlayView';
import WaitingView from './WaitingView';

export default function GameShell({ gameId }: { gameId: string }) {
  const playerId = usePlayerId(gameId);

  if (playerId === null) {
    // During SSR (and the very first client render) we don't know yet.
    return <NoPlayerIdState />;
  }
  return (
    <GameProvider gameId={gameId} playerId={playerId}>
      <GameViewSwitch />
    </GameProvider>
  );
}

function NoPlayerIdState() {
  return (
    <ErrorView
      title="Missing player identity"
      detail="We couldn't find your player id for this game. Return to the lobby and join again."
    />
  );
}

function GameViewSwitch() {
  const { state, connection, errorMessage, playerId, dismissError } = useGame();

  if (connection === 'closed' || connection === 'error') {
    return (
      <ErrorView
        title="Connection lost"
        detail="The server connection dropped. Try refreshing or returning to the lobby."
      />
    );
  }
  if (!state) {
    return <p className="p-6 opacity-70">Connecting…</p>;
  }
  const me = state.players[playerId];
  if (!me) {
    return (
      <ErrorView title="Unknown player" detail="The server does not recognize you for this game." />
    );
  }
  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          onClick={dismissError}
          className="fixed top-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded text-sm cursor-pointer z-50"
          style={{ background: 'var(--brand-danger)', color: 'var(--surface-fg)' }}
        >
          {errorMessage} (tap to dismiss)
        </div>
      )}
      {renderForStatus(state.status, me.ready)}
    </>
  );
}

function renderForStatus(status: string, meReady: boolean): React.ReactNode {
  if (status === 'lobby') return <WaitingView />;
  if (status === 'placement') return meReady ? <WaitingView /> : <PlacementView />;
  if (status === 'playing' || status === 'finished') return <PlayView />;
  return <ErrorView title="Unknown game state" detail={`status=${status}`} />;
}
