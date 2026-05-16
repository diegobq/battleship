"use client";
import { ShotEvent } from "@/lib/ui/GameProvider";
import styles from "./Effects.module.css";

export interface ShotToastProps {
  event: ShotEvent | null;
  selfId: string;
}

export default function ShotToast({ event, selfId }: ShotToastProps) {
  if (!event) return null;
  const verbSelf = event.shooterId === selfId;
  if (event.sunkShipType) {
    return (
      <div key={event.at} className={`${styles.toast} ${styles.sunk}`}>
        🚢{" "}
        {verbSelf
          ? `You sunk their ${event.sunkShipType}!`
          : `Your ${event.sunkShipType} was sunk!`}
      </div>
    );
  }
  if (event.hit) {
    return (
      <div key={event.at} className={`${styles.toast} ${styles.hit}`}>
        💥 {verbSelf ? "Hit!" : "They hit you!"} +{event.scoreAwarded}
      </div>
    );
  }
  return (
    <div key={event.at} className={`${styles.toast} ${styles.miss}`}>
      🌊 {verbSelf ? "Miss…" : "They missed."}
    </div>
  );
}
