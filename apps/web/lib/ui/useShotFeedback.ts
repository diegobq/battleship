"use client";
import { useCallback } from "react";

const SFX_KEY = "bs-sfx";

function isSfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SFX_KEY) !== "off";
}

function isReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playSound(type: "hit" | "miss" | "sunk") {
  const audio = new Audio(`/sounds/${type}.ogg`);
  audio.play().catch(() => {});
}

function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

export function useShotFeedback() {
  const onShot = useCallback(
    ({ hit, sunk }: { hit: boolean; sunk: boolean }) => {
      if (!isSfxEnabled() || isReducedMotion()) return;
      const type = sunk ? "sunk" : hit ? "hit" : "miss";
      playSound(type);
      if (sunk) vibrate([20, 40, 20]);
      else if (hit) vibrate(50);
    },
    [],
  );

  return { onShot };
}
