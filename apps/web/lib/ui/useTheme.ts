"use client";
import { useEffect, useReducer } from "react";

export const THEMES = ["default", "dark", "christmas"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "bs-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "default";
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored as Theme) ? (stored as Theme) : "default";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "default") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function useTheme() {
  const [theme, dispatch] = useReducer(
    (_: Theme, next: Theme) => next,
    "default" as Theme,
  );

  useEffect(() => {
    const stored = readStoredTheme();
    dispatch(stored);
    applyTheme(stored);
  }, []);

  function setTheme(next: Theme) {
    dispatch(next);
    sessionStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return { theme, setTheme, themes: THEMES };
}
