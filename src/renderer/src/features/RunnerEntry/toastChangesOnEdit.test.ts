import { describe, expect, it, vi } from "vitest";
import { DatabaseStatus } from "$shared/enums";
import { toastChangesOnEdit } from "./toastChangesOnEdit";

vi.mock("~/hooks/data/useTiming", () => ({
  duplicateToastKey: (bibId: number) => `duplicate:${Math.floor(bibId)}`,
  unknownAthleteToastKey: (bibId: number) => `unknown-athlete:${Math.floor(bibId)}`
}));

describe("toastChangesOnEdit", () => {
  it("closes the duplicate toast when a duplicate is corrected to a free bib", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: true,
        previousBib: 10.2,
        bib: 12,
        status: DatabaseStatus.Updated
      })
    ).toEqual({ dismiss: ["duplicate:10", "unknown-athlete:10"], createDuplicate: undefined });
  });

  it("moves the duplicate toast when corrected to a bib that already has a time", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: true,
        previousBib: 10.2,
        bib: 11,
        status: DatabaseStatus.Duplicate
      })
    ).toEqual({ dismiss: ["duplicate:10", "unknown-athlete:10"], createDuplicate: "duplicate:11" });
  });

  it("keeps every toast when a duplicate is edited without changing its bib", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: true,
        previousBib: 10.2,
        bib: 10.2,
        status: DatabaseStatus.Duplicate
      })
    ).toEqual({ dismiss: [], createDuplicate: undefined });
  });

  it("raises a duplicate toast when a normal record is edited onto a bib that already has a time", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: false,
        previousBib: 12,
        bib: 11,
        status: DatabaseStatus.Duplicate
      })
    ).toEqual({ dismiss: ["unknown-athlete:12"], createDuplicate: "duplicate:11" });
  });

  it("closes the unknown-athlete toast when an unknown bib is corrected", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: false,
        previousBib: 9991,
        bib: 41,
        status: DatabaseStatus.Updated
      })
    ).toEqual({ dismiss: ["unknown-athlete:9991"], createDuplicate: undefined });
  });

  it("leaves toasts alone when a note-only edit keeps the bib", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: false,
        previousBib: 9991,
        bib: 9991,
        status: DatabaseStatus.Updated
      })
    ).toEqual({ dismiss: [], createDuplicate: undefined });
  });

  it("changes nothing when the edit failed", () => {
    expect(
      toastChangesOnEdit({
        wasDuplicate: true,
        previousBib: 10.2,
        bib: 41,
        status: DatabaseStatus.Error
      })
    ).toEqual({ dismiss: [], createDuplicate: undefined });
  });
});
