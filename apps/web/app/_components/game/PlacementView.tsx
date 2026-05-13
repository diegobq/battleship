"use client";
import { Dispatch, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { Coordinate, Ship, expandShipCells } from "@battleship/core";
import { useGame } from "@/lib/ui/GameProvider";
import {
  PlacementAction,
  PlacementState,
  allShipsPlaced,
  canPreviewPlacement,
  initPlacementState,
  placementReducer,
} from "@/lib/ui/placementReducer";
import Board from "../Board/Board";
import ShipPalette from "../ShipPalette/ShipPalette";

interface Placement {
  reducerState: PlacementState;
  dispatch: Dispatch<PlacementAction>;
  hovered: Coordinate | null;
  setHovered: (c: Coordinate | null) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  previewCells: Coordinate[];
  previewInvalid: boolean;
}

function usePlacement(initialShips: Ship[]): Placement {
  const [reducerState, dispatch] = useReducer(placementReducer, initialShips, initPlacementState);
  const [hovered, setHovered] = useState<Coordinate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const previewCells = useMemo<Coordinate[]>(() => {
    if (!hovered || !reducerState.selectedShipId) return [];
    const ship = reducerState.ships.find((s) => s.id === reducerState.selectedShipId);
    if (!ship || ship.placed) return [];
    return expandShipCells(hovered, ship.length, reducerState.orientation);
  }, [hovered, reducerState.selectedShipId, reducerState.orientation, reducerState.ships]);
  const previewInvalid = hovered !== null && !canPreviewPlacement(reducerState, hovered.r, hovered.c);
  return { reducerState, dispatch, hovered, setHovered, submitted, setSubmitted, previewCells, previewInvalid };
}

export default function PlacementView() {
  const { state, playerId, placeFleet, leaveGame } = useGame();
  const me = state?.players[playerId];
  const initialShips = me?.ships ?? [];
  const placement = usePlacement(initialShips);

  if (!state || !me) return <p className="p-4">Loading…</p>;
  if (initialShips.length === 0) return <p className="p-4">Server hasn&apos;t sent your fleet yet. Hang tight…</p>;
  if (placement.submitted || me.ready) return <p className="p-4 text-center">Fleet locked in. Waiting for opponent…</p>;

  function ready(): void {
    const placements = placement.reducerState.ships.map((s) => ({
      shipId: s.id,
      r: s.positions[0].r,
      c: s.positions[0].c,
      orientation: s.orientation ?? "horizontal",
    }));
    placeFleet(placements);
    placement.setSubmitted(true);
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Place your fleet</h1>
        <p className="opacity-70 text-sm">
          Pick a ship from the palette, choose orientation, and tap a cell to place. Ships cannot overlap or extend off the board.
        </p>
      </header>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PlacementBoardSection placement={placement} />
        <PlacementControls placement={placement} onReady={ready} onLeave={leaveGame} />
      </div>
    </main>
  );
}

function PlacementBoardSection({ placement }: { placement: Placement }) {
  return (
    <Board
      grid={placement.reducerState.grid}
      showShips
      onCellClick={(r, c) => placement.dispatch({ type: "PLACE", r, c })}
      onCellHover={(r, c) => placement.setHovered(r === null || c === null ? null : { r, c })}
      previewCells={placement.previewCells}
      previewInvalid={placement.previewInvalid}
    />
  );
}

function PlacementControls({ placement, onReady, onLeave }: {
  placement: Placement;
  onReady: () => void;
  onLeave: () => boolean;
}) {
  const { reducerState, dispatch } = placement;
  return (
    <aside className="flex-1 flex flex-col gap-3">
      <ShipPalette
        ships={reducerState.ships}
        selectedShipId={reducerState.selectedShipId}
        onSelect={(id) => dispatch({ type: "SELECT", shipId: id })}
        onRemove={(id) => dispatch({ type: "REMOVE", shipId: id })}
      />
      <PlacementActionButtons reducerState={reducerState} dispatch={dispatch} onReady={onReady} onLeave={onLeave} />
    </aside>
  );
}

function PlacementActionButtons({ reducerState, dispatch, onReady, onLeave }: {
  reducerState: PlacementState;
  dispatch: Dispatch<PlacementAction>;
  onReady: () => void;
  onLeave: () => boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => dispatch({ type: "ROTATE" })} className="rounded px-3 py-2 text-sm" style={{ background: "var(--surface-muted)" }}>
        Rotate ({reducerState.orientation})
      </button>
      <button type="button" onClick={() => dispatch({ type: "RESET" })} className="rounded px-3 py-2 text-sm" style={{ background: "var(--surface-muted)" }}>
        Reset
      </button>
      <Link href="/" onClick={onLeave} className="rounded px-3 py-2 text-sm" style={{ background: "var(--surface-muted)", color: "var(--brand-danger)" }}>
        Leave game
      </Link>
      <button type="button" onClick={onReady} disabled={!allShipsPlaced(reducerState)} className="rounded px-4 py-2 font-semibold disabled:opacity-50 ml-auto" style={{ background: "var(--brand-success)", color: "var(--surface-bg)" }}>
        Let&apos;s play
      </button>
    </div>
  );
}
