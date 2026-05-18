"use client";
import { useEffect, useReducer } from "react";

const SFX_KEY = "bs-sfx";

function readSfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SFX_KEY) === "on";
}

export function useSfx() {
  const [sfxEnabled, dispatch] = useReducer(
    (_: boolean, next: boolean) => next,
    false,
  );

  useEffect(() => {
    dispatch(readSfxEnabled());
  }, []);

  function toggleSfx() {
    const next = !sfxEnabled;
    dispatch(next);
    if (next) sessionStorage.setItem(SFX_KEY, "on");
    else sessionStorage.removeItem(SFX_KEY);
  }

  return { sfxEnabled, toggleSfx };
}
