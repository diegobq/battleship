"use client";
import { useEffect, useSyncExternalStore } from "react";
import { toastStore, ToastItem } from "@/lib/ui/useToast";
import styles from "./ToastViewport.module.css";

const AUTO_DISMISS_MS = 5_000;
const EMPTY_TOASTS: ToastItem[] = [];

function Toast({ item }: { item: ToastItem }) {
  useEffect(() => {
    const t = setTimeout(() => toastStore.dismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [item.id]);

  return (
    <div
      key={item.id}
      role={item.variant === "error" ? "alert" : "status"}
      aria-live={item.variant === "error" ? "assertive" : "polite"}
      className={`${styles.toast} ${item.variant === "error" ? styles.error : styles.info}`}
    >
      <span className={styles.message}>{item.message}</span>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss"
        onClick={() => toastStore.dismiss(item.id)}
      >
        ×
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    () => EMPTY_TOASTS,
  );

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} aria-label="Notifications">
      {toasts.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}
