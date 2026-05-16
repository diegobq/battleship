"use client";
import { useEffect, useReducer } from "react";
import { ShotEvent } from "./types";

const COL_LABELS = "ABCDEFGH";
const MAX_SENTENCES = 10;

export function formatShot(shot: ShotEvent, selfId: string): string {
  const col = COL_LABELS[shot.c] ?? shot.c;
  const row = shot.r + 1;
  const byMe = shot.shooterId === selfId;

  if (shot.sunkShipType) {
    return byMe
      ? `You sunk the opponent's ${shot.sunkShipType} at ${col}${row}. +${shot.scoreAwarded} points.`
      : `Opponent sunk your ${shot.sunkShipType} at ${col}${row}.`;
  }
  if (shot.hit) {
    return byMe
      ? `You hit at ${col}${row}. +${shot.scoreAwarded} points.`
      : `Opponent hit your fleet at ${col}${row}.`;
  }
  return byMe
    ? `You missed at ${col}${row}.`
    : `Opponent missed at ${col}${row}.`;
}

function appendSentence(prev: string[], next: string): string[] {
  return [...prev.slice(-(MAX_SENTENCES - 1)), next];
}

export function useShotAnnouncement(
  lastShot: ShotEvent | null,
  selfId: string,
): string[] {
  const [sentences, dispatch] = useReducer(appendSentence, []);

  useEffect(() => {
    if (!lastShot) return;
    dispatch(formatShot(lastShot, selfId));
  }, [lastShot, selfId]);

  return sentences;
}
