import { describe, it, expect, beforeEach, vi } from "vitest";
import { toastStore } from "../useToast";

beforeEach(() => {
  toastStore.clearAll();
});

describe("toastStore", () => {
  it("error() adds a toast with variant='error'", () => {
    toastStore.error("something went wrong");
    const items = toastStore.getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0].variant).toBe("error");
    expect(items[0].message).toBe("something went wrong");
  });

  it("info() adds a toast with variant='info'", () => {
    toastStore.info("all good");
    expect(toastStore.getSnapshot()[0].variant).toBe("info");
  });

  it("dismiss() removes the toast by id", () => {
    const id = toastStore.error("bye");
    toastStore.dismiss(id);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });

  it("clearAll() empties the list", () => {
    toastStore.error("a");
    toastStore.info("b");
    toastStore.clearAll();
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });

  it("notifies subscribers on add", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);
    toastStore.error("ping");
    expect(listener).toHaveBeenCalledOnce();
    unsub();
  });

  it("notifies subscribers on dismiss", () => {
    const id = toastStore.error("ping");
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);
    toastStore.dismiss(id);
    expect(listener).toHaveBeenCalledOnce();
    unsub();
  });

  it("unsubscribing stops further notifications", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);
    unsub();
    toastStore.error("silent");
    expect(listener).not.toHaveBeenCalled();
  });
});
