import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme, THEMES } from "../useTheme";

beforeEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("useTheme", () => {
  it("starts with default theme when sessionStorage is empty", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");
  });

  it("reads the stored theme from sessionStorage on mount", () => {
    sessionStorage.setItem("bs-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {}); // flush effects
    expect(result.current.theme).toBe("dark");
  });

  it("setTheme updates the theme state", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    expect(result.current.theme).toBe("christmas");
  });

  it("setTheme persists to sessionStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(sessionStorage.getItem("bs-theme")).toBe("dark");
  });

  it("setTheme('default') removes the data-theme attribute", () => {
    document.documentElement.dataset.theme = "christmas";
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("default"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("setTheme(non-default) applies data-theme attribute", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    expect(document.documentElement.dataset.theme).toBe("christmas");
  });

  it("exposes all themes", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themes).toEqual(THEMES);
  });
});
