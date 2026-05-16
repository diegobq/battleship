import { afterEach, describe, expect, it, vi } from "vitest";
import { toastStore } from "../useToast";

afterEach(() => {
  toastStore.clearAll();
});

describe("toastStore.error / info", () => {
  it("adds an error toast", () => {
    toastStore.error("Something went wrong");
    expect(toastStore.getSnapshot()).toHaveLength(1);
    expect(toastStore.getSnapshot()[0]).toMatchObject({
      message: "Something went wrong",
      variant: "error",
    });
  });

  it("adds an info toast", () => {
    toastStore.info("Reconnected");
    expect(toastStore.getSnapshot()[0]).toMatchObject({ variant: "info" });
  });

  it("assigns unique ids", () => {
    const a = toastStore.error("a");
    const b = toastStore.info("b");
    expect(a).not.toBe(b);
  });

  it("stacks multiple toasts", () => {
    toastStore.error("first");
    toastStore.info("second");
    expect(toastStore.getSnapshot()).toHaveLength(2);
  });
});

describe("toastStore.dismiss", () => {
  it("removes the toast by id", () => {
    const id = toastStore.error("bye");
    toastStore.dismiss(id);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });

  it("is a no-op for an unknown id", () => {
    toastStore.error("keep me");
    toastStore.dismiss("not-an-id");
    expect(toastStore.getSnapshot()).toHaveLength(1);
  });
});

describe("toastStore.subscribe", () => {
  it("notifies listener on add and dismiss", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);
    toastStore.error("ping");
    expect(listener).toHaveBeenCalledTimes(1);
    const id = toastStore.getSnapshot()[0].id;
    toastStore.dismiss(id);
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);
    unsub();
    toastStore.error("silent");
    expect(listener).not.toHaveBeenCalled();
  });
});
