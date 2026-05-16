import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticShots } from "../useOptimisticShots";

describe("useOptimisticShots", () => {
  it("starts with an empty pending set", () => {
    const { result } = renderHook(() => useOptimisticShots());
    expect(result.current.pending.size).toBe(0);
  });

  it("addPending marks a cell as pending", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => result.current.addPending(2, 3));
    expect(result.current.pending.has("2,3")).toBe(true);
  });

  it("addPending is idempotent for the same cell", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => {
      result.current.addPending(0, 0);
      result.current.addPending(0, 0);
    });
    expect(result.current.pending.size).toBe(1);
  });

  it("reconcile removes a pending cell", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => result.current.addPending(1, 1));
    act(() => result.current.reconcile(1, 1));
    expect(result.current.pending.has("1,1")).toBe(false);
  });

  it("reconcile is a no-op for a cell that is not pending", () => {
    const { result } = renderHook(() => useOptimisticShots());
    expect(() => act(() => result.current.reconcile(5, 5))).not.toThrow();
    expect(result.current.pending.size).toBe(0);
  });

  it("multiple pending cells are tracked independently", () => {
    const { result } = renderHook(() => useOptimisticShots());
    act(() => {
      result.current.addPending(0, 0);
      result.current.addPending(1, 1);
    });
    act(() => result.current.reconcile(0, 0));
    expect(result.current.pending.has("0,0")).toBe(false);
    expect(result.current.pending.has("1,1")).toBe(true);
  });
});
