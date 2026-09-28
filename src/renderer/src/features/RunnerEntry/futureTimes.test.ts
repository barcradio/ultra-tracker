import { describe, expect, it } from "vitest";
import { getFutureTimeLabels } from "./futureTimes";

const now = new Date("2026-09-20T12:00:00Z");
const past = new Date("2026-09-20T11:59:59Z");
const future = new Date("2026-09-20T12:00:01Z");

describe("getFutureTimeLabels", () => {
  it("reports nothing when both times are in the past", () => {
    expect(getFutureTimeLabels({ in: past, out: past }, now)).toEqual([]);
  });

  it("reports nothing for missing times", () => {
    expect(getFutureTimeLabels({ in: null, out: null }, now)).toEqual([]);
  });

  it("treats a time equal to now as not in the future", () => {
    expect(getFutureTimeLabels({ in: now, out: null }, now)).toEqual([]);
  });

  it("reports each time that is later than now", () => {
    expect(getFutureTimeLabels({ in: future, out: null }, now)).toEqual(["In"]);
    expect(getFutureTimeLabels({ in: past, out: future }, now)).toEqual(["Out"]);
    expect(getFutureTimeLabels({ in: future, out: future }, now)).toEqual(["In", "Out"]);
  });
});
