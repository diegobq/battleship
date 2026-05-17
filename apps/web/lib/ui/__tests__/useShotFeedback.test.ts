import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShotFeedback } from "../useShotFeedback";

const mockOsc = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { value: 0 },
};
const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};

beforeEach(() => {
  sessionStorage.setItem("bs-sfx", "on");
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      destination = {};
      currentTime = 0;
      createOscillator = () => mockOsc;
      createGain = () => mockGain;
      resume = vi.fn();
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(navigator, "vibrate", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  mockOsc.start.mockClear();
});

describe("useShotFeedback", () => {
  it("onShot does not throw for a hit", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() =>
      act(() => result.current.onShot({ hit: true, sunk: false })),
    ).not.toThrow();
  });

  it("onShot does not throw for a miss", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() =>
      act(() => result.current.onShot({ hit: false, sunk: false })),
    ).not.toThrow();
  });

  it("onShot does not throw for a sunk ship", () => {
    const { result } = renderHook(() => useShotFeedback());
    expect(() =>
      act(() => result.current.onShot({ hit: true, sunk: true })),
    ).not.toThrow();
  });

  it("skips feedback when sfx is disabled", () => {
    sessionStorage.removeItem("bs-sfx");
    const vibrateSpy = vi.spyOn(navigator, "vibrate");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onShot({ hit: true, sunk: true }));
    expect(vibrateSpy).not.toHaveBeenCalled();
    expect(mockOsc.start).not.toHaveBeenCalled();
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

  it("onTurnStart plays sound when sfx is enabled", () => {
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onTurnStart());
    expect(mockOsc.start).toHaveBeenCalled();
  });

  it("onTurnStart skips audio when sfx is disabled", () => {
    sessionStorage.removeItem("bs-sfx");
    const { result } = renderHook(() => useShotFeedback());
    act(() => result.current.onTurnStart());
    expect(mockOsc.start).not.toHaveBeenCalled();
  });
});
