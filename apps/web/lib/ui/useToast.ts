"use client";

export type ToastVariant = "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = () => void;

let items: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function add(message: string, variant: ToastVariant): string {
  const id = String(++nextId);
  items = [...items, { id, message, variant }];
  notify();
  return id;
}

function dismiss(id: string) {
  items = items.filter((t) => t.id !== id);
  notify();
}

function clearAll() {
  items = [];
  notify();
}

export const toastStore = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => items,
  error: (message: string) => add(message, "error"),
  info: (message: string) => add(message, "info"),
  dismiss,
  clearAll,
};

export function useToast() {
  return toastStore;
}
