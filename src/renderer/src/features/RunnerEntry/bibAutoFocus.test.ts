import { describe, expect, it } from "vitest";
import { shouldFocusBibOnKey } from "./bibAutoFocus";

const press = (
  key: string,
  modifiers: Partial<Record<"ctrlKey" | "metaKey" | "altKey", boolean>> = {}
) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers
});

describe("shouldFocusBibOnKey", () => {
  it("focuses the bib field for every digit", () => {
    for (const digit of "0123456789") {
      expect(shouldFocusBibOnKey(press(digit), false)).toBe(true);
    }
  });

  it("ignores keys that are not digits", () => {
    for (const key of ["a", "Enter", "-", "+", "!", "Tab", "F1", " "]) {
      expect(shouldFocusBibOnKey(press(key), false)).toBe(false);
    }
  });

  it("leaves modifier shortcuts alone", () => {
    expect(shouldFocusBibOnKey(press("0", { ctrlKey: true }), false)).toBe(false);
    expect(shouldFocusBibOnKey(press("1", { metaKey: true }), false)).toBe(false);
    expect(shouldFocusBibOnKey(press("2", { altKey: true }), false)).toBe(false);
  });

  it("does not steal digits typed into another field", () => {
    expect(shouldFocusBibOnKey(press("5"), true)).toBe(false);
  });
});
