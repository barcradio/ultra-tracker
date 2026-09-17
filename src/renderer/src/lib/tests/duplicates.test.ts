import { describe, expect, it } from "vitest";
import { findRowIndexBySequence, findSiblingSequences } from "../duplicates";

describe("findSiblingSequences", () => {
  // A bib logged again always reads .2, so two rows can carry the same one.
  const rows = [
    { bibId: 101, sequence: 11 },
    { bibId: 130, sequence: 12 },
    { bibId: 205, sequence: 13 },
    { bibId: 130.2, sequence: 14 },
    { bibId: 130.2, sequence: 15 }
  ];

  it("reports the sequence of every other record sharing the bib", () => {
    expect(findSiblingSequences(rows, 1)).toEqual([14, 15]);
  });

  it("finds the original from a duplicate", () => {
    expect(findSiblingSequences(rows, 3)).toEqual([12, 15]);
  });

  it("separates two records carrying the identical duplicate bib", () => {
    expect(findSiblingSequences(rows, 4)).toEqual([12, 14]);
  });

  it("never reports the record itself", () => {
    expect(findSiblingSequences(rows, 4)).not.toContain(15);
  });

  it("reports nothing for a bib logged once", () => {
    expect(findSiblingSequences(rows, 0)).toEqual([]);
  });

  it("reports the same sequences however the grid is sorted", () => {
    const resorted = [rows[4], rows[2], rows[1]];

    expect(findSiblingSequences(resorted, 0)).toEqual([12]);
  });

  it("copes with an index that is not in the list", () => {
    expect(findSiblingSequences(rows, 99)).toEqual([]);
  });
});

describe("findRowIndexBySequence", () => {
  const rows = [{ sequence: 11 }, { sequence: 12 }, { sequence: 13 }];

  it("finds where a sequence currently sits", () => {
    expect(findRowIndexBySequence(rows, 12)).toBe(1);
  });

  it("reports -1 when the record is filtered out of view", () => {
    expect(findRowIndexBySequence(rows, 99)).toBe(-1);
  });
});
