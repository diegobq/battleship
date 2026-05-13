'use client';
import Link from 'next/link';
import { useMemo, useReducer, useState } from 'react';
import { expandShipCells } from '@battleship/core';
import { Coordinate, Ship } from '@battleship/core';
import { useGame } from '@/lib/ui/GameProvider';
import {
  PlacementState,
  allShipsPlaced,
  canPreviewPlacement,
  initPlacementState,
  placementReducer,
} from '@/lib/ui/placementReducer';
import Board from '../Board/Board';
import ShipPalette from '../ShipPalette/ShipPalette';

export default function PlacementView() {
  const { state, playerId, placeFleet, leaveGame } = useGame();
  const me = state?.players[playerId];
  const initialShips = me?.ships ?? [];
  // GameShell only renders this view once status === 'placement', at which point
  // the server has already built the fleet — ships are guaranteed non-empty.
  const [reducerState, dispatch] = useReducer(
    placementReducer,
    initialShips,
    initPlacementState,
  );
  const [hovered, setHovered] = useState<Coordinate | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const previewCells = useMemo<Coordinate[]>(() => {
    if (!hovered || !reducerState.selectedShipId) return [];
    const ship = reducerState.ships.find((s) => s.id === reducerState.selectedShipId);
    if (!ship || ship.placed) return [];
    return expandShipCells(hovered, ship.length, reducerState.orientation);
  }, [hovered, reducerState.selectedShipId, reducerState.orientation, reducerState.ships]);

  const previewInvalid =
    hovered !== null && !canPreviewPlacement(reducerState, hovered.r, hovered.c);

  function ready(): void {
    const placements = reducerState.ships.map((s) => ({
      shipId: s.id,
      r: s.positions[0].r,
      c: s.positions[0].c,
      orientation: s.orientation ?? 'horizontal',
    }));
    placeFleet(placements);
    setSubmitted(true);
  }

  if (!state || !me) return <p className="p-4">Loading…</p>;
  if (initialShips.length === 0) {
    return <p className="p-4">Server hasn’t sent your fleet yet. Hang tight…</p>;
  }
  if (submitted || me.ready) {
    return (
      <p className="p-4 text-center">
        Fleet locked in. Waiting for opponent…
      </p>
    );
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Place your fleet</h1>
        <p className="opacity-70 text-sm">
          Pick a ship from the palette, choose orientation, and tap a cell to place. Ships cannot
          overlap or extend off the board.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Board
          grid={reducerState.grid}
          showShips
          onCellClick={(r, c) => dispatch({ type: 'PLACE', r, c })}
          onCellHover={(r, c) => setHovered(r === null || c === null ? null : { r, c })}
          previewCells={previewCells}
          previewInvalid={previewInvalid}
        />

        <aside className="flex-1 flex flex-col gap-3">
          <ShipPalette
            ships={reducerState.ships}
            selectedShipId={reducerState.selectedShipId}
            onSelect={(id) => dispatch({ type: 'SELECT', shipId: id })}
            onRemove={(id) => dispatch({ type: 'REMOVE', shipId: id })}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'ROTATE' })}
              className="rounded px-3 py-2 text-sm"
              style={{ background: 'var(--surface-muted)' }}
            >
              Rotate ({reducerState.orientation})
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET' })}
              className="rounded px-3 py-2 text-sm"
              style={{ background: 'var(--surface-muted)' }}
            >
              Reset
            </button>
            <Link
              href="/"
              onClick={leaveGame}
              className="rounded px-3 py-2 text-sm"
              style={{ background: 'var(--surface-muted)', color: 'var(--brand-danger)' }}
            >
              Leave game
            </Link>
            <button
              type="button"
              onClick={ready}
              disabled={!allShipsPlaced(reducerState)}
              className="rounded px-4 py-2 font-semibold disabled:opacity-50 ml-auto"
              style={{ background: 'var(--brand-success)', color: 'var(--surface-bg)' }}
            >
              Let's play
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

// Ensures unused import is kept for clarity in the IDE.
export type _PlacementState = PlacementState;
export type _Ship = Ship;
