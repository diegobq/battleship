import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticShots } from "../useOptimisticShots";

describe("useOptimisticShots — addPending", () => {
  it("marks a cell as pending", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => result.current.addPending(3, 5));
    expect(result.current.pending.has("3,5")).toBe(true);
  });

  it("accumulates multiple pending cells", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => {
      result.current.addPending(0, 0);
      result.current.addPending(1, 1);
    });
    expect(result.current.pending.size).toBe(2);
  });

  it("is idempotent for the same cell", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => {
      result.current.addPending(0, 0);
      result.current.addPending(0, 0);
    });
    expect(result.current.pending.size).toBe(1);
  });
});

describe("useOptimisticShots — reconcile", () => {
  it("removes the cell after reconcile", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => result.current.addPending(2, 3));
    act(() => result.current.reconcile(2, 3));
    expect(result.current.pending.has("2,3")).toBe(false);
  });

  it("leaves other pending cells intact", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => {
      result.current.addPending(0, 0);
      result.current.addPending(1, 1);
    });
    act(() => result.current.reconcile(0, 0));
    expect(result.current.pending.has("1,1")).toBe(true);
    expect(result.current.pending.has("0,0")).toBe(false);
  });

  it("is a no-op for a cell that was never pending", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => result.current.addPending(0, 0));
    act(() => result.current.reconcile(7, 7));
    expect(result.current.pending.size).toBe(1);
  });
});
