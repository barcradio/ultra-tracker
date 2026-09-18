import { describe, expect, it } from "vitest";
import {
  duplicatedBibs,
  findNextSiblingSequence,
  findOriginalSequence,
  findRowIndexBySequence,
  findSiblingSequences
} from "../duplicates";

describe("findSiblingSequences", () => {
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

describe("findNextSiblingSequence", () => {
  const rows = [
    { bibId: 101, sequence: 11 },
    { bibId: 130, sequence: 12 },
    { bibId: 205, sequence: 13 },
    { bibId: 130.2, sequence: 14 },
    { bibId: 130.2, sequence: 15 }
  ];

  it("goes to the next record sharing the bib, not the first", () => {
    expect(findNextSiblingSequence(rows, 3)).toBe(15);
  });

  it("wraps to the top once past the last of them", () => {
    expect(findNextSiblingSequence(rows, 4)).toBe(12);
  });

  it("visits every duplicate in turn rather than cycling between two", () => {
    const visited: number[] = [];
    let index = 1;

    for (let step = 0; step < 3; step += 1) {
      const next = findNextSiblingSequence(rows, index);
      visited.push(next!);
      index = findRowIndexBySequence(rows, next!);
    }

    expect(visited).toEqual([14, 15, 12]);
  });

  it("reports nothing for a bib logged once", () => {
    expect(findNextSiblingSequence(rows, 0)).toBeNull();
  });

  it("copes with an index that is not in the list", () => {
    expect(findNextSiblingSequence(rows, 99)).toBeNull();
  });
});

describe("findOriginalSequence", () => {
  const rows = [
    { bibId: 101, sequence: 11 },
    { bibId: 130, sequence: 12 },
    { bibId: 205, sequence: 13 },
    { bibId: 130.2, sequence: 14 },
    { bibId: 130.2, sequence: 15 }
  ];

  it("reports the whole-numbered record a duplicate belongs to", () => {
    expect(findOriginalSequence(rows, 3)).toBe(12);
    expect(findOriginalSequence(rows, 4)).toBe(12);
  });

  it("reports nothing when asked about the original itself", () => {
    expect(findOriginalSequence(rows, 1)).toBeNull();
  });

  it("reports nothing when the original is filtered out of view", () => {
    expect(findOriginalSequence([rows[3], rows[0]], 0)).toBeNull();
  });

  it("copes with an index that is not in the list", () => {
    expect(findOriginalSequence(rows, 99)).toBeNull();
  });
});

describe("duplicatedBibs", () => {
  const rows = [
    { bibId: 101 },
    { bibId: 130 },
    { bibId: 205 },
    { bibId: 130.2 },
    { bibId: 130.2 },
    { bibId: 77.2 }
  ];

  it("reports the bibs that were logged more than once", () => {
    expect(duplicatedBibs(rows)).toEqual(new Set([130, 77]));
  });

  it("leaves a bib logged once out of it", () => {
    expect(duplicatedBibs(rows).has(101)).toBe(false);
  });

  it("copes with an empty grid", () => {
    expect(duplicatedBibs([])).toEqual(new Set());
  });
});
