import { describe, expect, it } from "vitest";
import { ColumnDef } from "./types";
import { shouldShowTrailingUtilityColumn } from "./utilityColumn";

type Row = {
  id: string;
  value: string;
};

describe("shouldShowTrailingUtilityColumn", () => {
  it("keeps the utility column visible when filters are available", () => {
    const columns: ColumnDef<Row> = [{ field: "id", name: "ID" }, { field: "value", name: "Value" }];

    expect(shouldShowTrailingUtilityColumn(columns, false)).toBe(true);
  });

  it("hides the utility column when disabled and all columns are non-filterable", () => {
    const columns: ColumnDef<Row> = [
      { field: "id", name: "ID", filterable: false },
      { field: "value", name: "Value", filterable: false }
    ];

    expect(shouldShowTrailingUtilityColumn(columns, false)).toBe(false);
  });

  it("keeps the utility column visible when explicitly enabled", () => {
    const columns: ColumnDef<Row> = [{ field: "id", name: "ID", filterable: false }];

    expect(shouldShowTrailingUtilityColumn(columns, true)).toBe(true);
  });
});
