'use client';
import { BoardCellStatus, Coordinate } from '@/lib/core/types';
import styles from './Board.module.css';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export interface BoardProps {
  grid: BoardCellStatus[][];
  onCellClick?: (r: number, c: number) => void;
  onCellHover?: (r: number | null, c: number | null) => void;
  previewCells?: Coordinate[];
  previewInvalid?: boolean;
  // If true, ship cells render as such; otherwise they appear empty (enemy board).
  showShips?: boolean;
  disabled?: boolean;
}

function isInPreview(previewCells: Coordinate[] | undefined, r: number, c: number): boolean {
  if (!previewCells) return false;
  return previewCells.some((p) => p.r === r && p.c === c);
}

function cellClass(status: BoardCellStatus, opts: { preview: boolean; invalid: boolean; showShips: boolean; disabled: boolean }): string {
  const classes = [styles.cell];
  if (opts.preview) {
    classes.push(opts.invalid ? styles.previewInvalid : styles.preview);
  } else if (status === 'ship' && opts.showShips) {
    classes.push(styles.ship);
  } else if (status === 'hit') {
    classes.push(styles.hit);
  } else if (status === 'miss') {
    classes.push(styles.miss);
  }
  if (opts.disabled) classes.push(styles.disabled);
  return classes.join(' ');
}

export default function Board({
  grid,
  onCellClick,
  onCellHover,
  previewCells,
  previewInvalid = false,
  showShips = false,
  disabled = false,
}: BoardProps) {
  return (
    <div
      className={styles.board}
      role="grid"
      aria-label="Board"
      onPointerLeave={() => onCellHover?.(null, null)}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const preview = isInPreview(previewCells, r, c);
          return (
            <button
              type="button"
              key={`${r}-${c}`}
              className={cellClass(cell, {
                preview,
                invalid: previewInvalid,
                showShips,
                disabled,
              })}
              disabled={disabled}
              onPointerEnter={() => onCellHover?.(r, c)}
              onClick={() => !disabled && onCellClick?.(r, c)}
              aria-label={`${COL_LABELS[c]}${r + 1}`}
            >
              {r === 0 && <span className="absolute top-0.5 left-0.5 text-[10px] opacity-50">{COL_LABELS[c]}</span>}
              {c === 0 && <span className="absolute bottom-0.5 right-0.5 text-[10px] opacity-50">{r + 1}</span>}
            </button>
          );
        }),
      )}
    </div>
  );
}
