import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSfx } from "../useSfx";

beforeEach(() => {
  sessionStorage.clear();
});

describe("useSfx", () => {
  it("defaults to disabled when sessionStorage has no entry", async () => {
    const { result } = renderHook(() => useSfx());
    await act(async () => {});
    expect(result.current.sfxEnabled).toBe(false);
  });

  it("hydrates as enabled when sessionStorage is set to on", async () => {
    sessionStorage.setItem("bs-sfx", "on");
    const { result } = renderHook(() => useSfx());
    await act(async () => {});
    expect(result.current.sfxEnabled).toBe(true);
  });

  it("toggleSfx enables sfx and writes on to sessionStorage", async () => {
    const { result } = renderHook(() => useSfx());
    await act(async () => {});
    act(() => result.current.toggleSfx());
    expect(result.current.sfxEnabled).toBe(true);
    expect(sessionStorage.getItem("bs-sfx")).toBe("on");
  });

  it("toggleSfx disables sfx and removes the sessionStorage key", async () => {
    sessionStorage.setItem("bs-sfx", "on");
    const { result } = renderHook(() => useSfx());
    await act(async () => {});
    act(() => result.current.toggleSfx());
    expect(result.current.sfxEnabled).toBe(false);
    expect(sessionStorage.getItem("bs-sfx")).toBeNull();
  });
});
