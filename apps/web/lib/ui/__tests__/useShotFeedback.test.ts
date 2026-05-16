import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShotFeedback } from "../useShotFeedback";
import { renderHook, act } from "@testing-library/react";

let mockPlay: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  mockPlay = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "Audio",
    vi.fn(() => ({ play: mockPlay })),
  );
  vi.stubGlobal("navigator", { vibrate: vi.fn() });
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("useShotFeedback — sfx enabled", () => {
  it("plays hit sound and vibrates on a hit", () => {
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: false }));
    expect(Audio).toHaveBeenCalledWith("/sounds/hit.ogg");
    expect(mockPlay).toHaveBeenCalled();
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it("plays miss sound and does not vibrate on a miss", () => {
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: false, sunk: false }));
    expect(Audio).toHaveBeenCalledWith("/sounds/miss.ogg");
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("plays sunk sound and uses multi-pulse vibration on sunk", () => {
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: true }));
    expect(Audio).toHaveBeenCalledWith("/sounds/sunk.ogg");
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 40, 20]);
  });
});

describe("useShotFeedback — sfx disabled", () => {
  it("plays nothing when bs-sfx is off", () => {
    localStorage.setItem("bs-sfx", "off");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: false }));
    expect(Audio).not.toHaveBeenCalled();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });
});

describe("useShotFeedback — reduced motion", () => {
  it("plays nothing when prefers-reduced-motion matches", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: false }));
    expect(Audio).not.toHaveBeenCalled();
  });
});
