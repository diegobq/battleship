'use client';
import { Ship } from '@/lib/core/types';
import styles from './ShipPalette.module.css';

export interface ShipPaletteProps {
  ships: Ship[];
  selectedShipId: string | null;
  onSelect: (shipId: string) => void;
  onRemove?: (shipId: string) => void;
}

export default function ShipPalette({ ships, selectedShipId, onSelect, onRemove }: ShipPaletteProps) {
  return (
    <ul className={styles.palette} role="list" aria-label="Fleet">
      {ships.map((s) => {
        const selected = s.id === selectedShipId;
        const cls = [styles.ship, selected ? styles.selected : '', s.placed ? styles.placed : '']
          .filter(Boolean)
          .join(' ');
        return (
          <li key={s.id}>
            <button
              type="button"
              className={cls}
              onClick={() => onSelect(s.id)}
              aria-pressed={selected}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <span className={styles.cells} aria-hidden>
                {Array.from({ length: s.length }).map((_, i) => (
                  <span key={i} className={styles.cell} />
                ))}
              </span>
              <span className={styles.label}>
                {s.type} ({s.length})
              </span>
              {s.placed && onRemove && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(s.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(s.id);
                    }
                  }}
                  className={styles.removeButton}
                >
                  Remove
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
