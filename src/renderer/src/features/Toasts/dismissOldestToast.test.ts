import { describe, expect, it } from "vitest";
import { dismissOldestToast } from "./dismissOldestToast";

const toast = (id: string, key: string | undefined, minute: number) => ({
  id,
  key,
  epoch: new Date(`2026-09-20T12:${String(minute).padStart(2, "0")}:00Z`)
});

describe("dismissOldestToast", () => {
  it("removes the toast with the matching key", () => {
    const toasts = [toast("a", "duplicate:150", 0), toast("b", undefined, 1)];

    expect(dismissOldestToast(toasts, "duplicate:150").map((t) => t.id)).toEqual(["b"]);
  });

  it("removes only the oldest when several share a key", () => {
    const toasts = [toast("newer", "duplicate:150", 5), toast("older", "duplicate:150", 1)];

    expect(dismissOldestToast(toasts, "duplicate:150").map((t) => t.id)).toEqual(["newer"]);
  });

  it("leaves toasts for other keys alone", () => {
    const toasts = [toast("a", "duplicate:151", 0), toast("b", undefined, 1)];

    expect(dismissOldestToast(toasts, "duplicate:150")).toBe(toasts);
  });
});
