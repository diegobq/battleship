import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShotFeedback } from "../useShotFeedback";

beforeEach(() => {
  localStorage.setItem("bs-sfx", "on");
  // Stub Audio constructor: play() resolves immediately.
  vi.stubGlobal(
    "Audio",
    class {
      src = "";
      play = vi.fn().mockResolvedValue(undefined);
    },
  );
  // Stub matchMedia to report no reduced-motion preference.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  // Stub vibrate.
  Object.defineProperty(navigator, "vibrate", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

describe("useShotFeedback", () => {
  it("onShot does not throw for a hit", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() => act(() => result.current.onShot({ hit: true, sunk: false }))).not.toThrow();
  });

  it("onShot does not throw for a miss", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() => act(() => result.current.onShot({ hit: false, sunk: false }))).not.toThrow();
  });

  it("onShot does not throw for a sunk ship", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() => act(() => result.current.onShot({ hit: true, sunk: true }))).not.toThrow();
  });

  it("skips feedback when sfx is disabled", () => {
    localStorage.setItem("bs-sfx", "off");
    const vibrateSpy = vi.spyOn(navigator, "vibrate");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: true }));
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it("calls navigator.vibrate on sunk", () => {
    const vibrateSpy = vi.spyOn(navigator, "vibrate");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: true }));
    expect(vibrateSpy).toHaveBeenCalledWith([20, 40, 20]);
  });

  it("calls navigator.vibrate with single value on hit (not sunk)", () => {
    const vibrateSpy = vi.spyOn(navigator, "vibrate");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: false }));
    expect(vibrateSpy).toHaveBeenCalledWith(50);
  });
});
