import { describe, expect, it } from "vitest";
import { findSiblingRowNumbers } from "../duplicates";

describe("findSiblingRowNumbers", () => {
  // A third entry for the same bib is numbered 130.2 again, so two rows really can share one.
  const rows = [{ bibId: 101 }, { bibId: 130 }, { bibId: 205 }, { bibId: 130.2 }, { bibId: 130.2 }];

  it("numbers rows as the operator sees them, from one", () => {
    expect(findSiblingRowNumbers(rows, 1)).toEqual([4, 5]);
  });

  it("finds the original from a duplicate", () => {
    expect(findSiblingRowNumbers(rows, 3)).toEqual([2, 5]);
  });

  it("separates two rows that carry the identical duplicate bib", () => {
    expect(findSiblingRowNumbers(rows, 4)).toEqual([2, 4]);
  });

  it("never reports the row itself", () => {
    expect(findSiblingRowNumbers(rows, 4)).not.toContain(5);
  });

  it("reports nothing for a bib logged once", () => {
    expect(findSiblingRowNumbers(rows, 0)).toEqual([]);
  });

  it("follows the current sort rather than the underlying record order", () => {
    const resorted = [{ bibId: 130.2 }, { bibId: 205 }, { bibId: 130 }];

    expect(findSiblingRowNumbers(resorted, 0)).toEqual([3]);
  });

  it("copes with an index that is not in the list", () => {
    expect(findSiblingRowNumbers(rows, 99)).toEqual([]);
  });
});
