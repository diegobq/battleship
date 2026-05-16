import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { THEMES, useTheme } from "../useTheme";
import { renderHook, act } from "@testing-library/react";

beforeEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  sessionStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("useTheme — initial state", () => {
  it("defaults to 'default' when nothing is stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");
  });

  it("reads a previously stored theme", () => {
    sessionStorage.setItem("bs-theme", "christmas");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("christmas");
  });

  it("falls back to default for an unrecognised stored value", () => {
    sessionStorage.setItem("bs-theme", "neon-punk");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("default");
  });
});

describe("useTheme — setTheme", () => {
  it("updates theme state", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    expect(result.current.theme).toBe("christmas");
  });

  it("persists to sessionStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    expect(sessionStorage.getItem("bs-theme")).toBe("christmas");
  });

  it("sets data-theme attribute on <html> for non-default themes", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    expect(document.documentElement.dataset.theme).toBe("christmas");
  });

  it("removes data-theme attribute when switching back to default", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("christmas"));
    act(() => result.current.setTheme("default"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe("useTheme — themes list", () => {
  it("exposes all available themes", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themes).toEqual(THEMES);
  });
});
