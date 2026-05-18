"use client";
import { useCallback } from "react";

const SFX_KEY = "bs-sfx";

function shouldPlay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    sessionStorage.getItem(SFX_KEY) === "on" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

let _ctx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function synth(frequency: number, duration = 0.25) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playShot(type: "hit" | "miss" | "sunk") {
  synth(type === "hit" ? 880 : type === "miss" ? 220 : 660);
}

function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

export function useShotFeedback() {
  const onShot = useCallback(
    ({ hit, sunk }: { hit: boolean; sunk: boolean }) => {
      if (!shouldPlay()) return;
      playShot(sunk ? "sunk" : hit ? "hit" : "miss");
      if (sunk) vibrate([20, 40, 20]);
      else if (hit) vibrate(50);
    },
    [],
  );

  const onTurnStart = useCallback(() => {
    if (!shouldPlay()) return;
    synth(1047, 0.3);
  }, []);

  return { onShot, onTurnStart };
}
