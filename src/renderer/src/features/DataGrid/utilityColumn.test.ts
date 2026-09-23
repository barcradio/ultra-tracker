import { describe, expect, it } from "vitest";
import { ColumnDef } from "./types";
import { shouldShowTrailingUtilityColumn } from "./utilityColumn";

type Row = {
  id: string;
  value: string;
};

describe("shouldShowTrailingUtilityColumn", () => {
  const columns: ColumnDef<Row> = [{ field: "id", name: "ID" }, { field: "value", name: "Value" }];

  it("hides the utility column when explicitly disabled", () => {
    expect(shouldShowTrailingUtilityColumn(columns, false)).toBe(false);
  });

  it("keeps the utility column visible when explicitly enabled", () => {
    expect(shouldShowTrailingUtilityColumn(columns, true)).toBe(true);
  });

  it("keeps the utility column visible by default", () => {
    expect(shouldShowTrailingUtilityColumn(columns)).toBe(true);
  });
});
