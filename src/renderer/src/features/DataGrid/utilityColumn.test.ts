import { describe, expect, it } from "vitest";
import { ColumnDef } from "./types";
import { shouldShowResetButton, shouldShowTrailingUtilityColumn } from "./utilityColumn";

type Row = {
  id: string;
  value: string;
};

describe("shouldShowTrailingUtilityColumn", () => {
  it("hides the utility column when explicitly disabled", () => {
    expect(shouldShowTrailingUtilityColumn(false)).toBe(false);
  });

  it("keeps the utility column visible when explicitly enabled", () => {
    expect(shouldShowTrailingUtilityColumn(true)).toBe(true);
  });

  it("keeps the utility column visible by default", () => {
    expect(shouldShowTrailingUtilityColumn()).toBe(true);
  });
});

describe("shouldShowResetButton", () => {
  const filterableColumns: ColumnDef<Row> = [{ field: "id", name: "ID" }, { field: "value", name: "Value" }];

  const nonFilterableColumns: ColumnDef<Row> = [
    { field: "id", name: "ID", filterable: false },
    { field: "value", name: "Value", filterable: false }
  ];

  it("shows reset when utility column is enabled and filters are available", () => {
    expect(shouldShowResetButton(filterableColumns, true)).toBe(true);
  });

  it("hides reset when utility column is explicitly disabled", () => {
    expect(shouldShowResetButton(filterableColumns, false)).toBe(false);
  });

  it("hides reset when all columns are non-filterable", () => {
    expect(shouldShowResetButton(nonFilterableColumns, true)).toBe(false);
  });
});
