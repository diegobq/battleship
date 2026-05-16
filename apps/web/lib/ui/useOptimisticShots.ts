"use client";
import { useCallback, useState } from "react";

function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function useOptimisticShots() {
  const [pending, setPending] = useState<Set<string>>(new Set());

  const addPending = useCallback((r: number, c: number) => {
    setPending((prev) => new Set([...prev, key(r, c)]));
  }, []);

  const reconcile = useCallback((r: number, c: number) => {
    setPending((prev) => {
      const next = new Set(prev);
      next.delete(key(r, c));
      return next;
    });
  }, []);

  return { pending, addPending, reconcile };
}
