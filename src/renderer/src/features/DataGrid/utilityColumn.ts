import { ColumnDef } from "./types";

export function shouldShowTrailingUtilityColumn(showTrailingUtilityColumn?: boolean): boolean {
  return showTrailingUtilityColumn !== false;
}

export function shouldShowResetButton<T extends object>(
  columns: ColumnDef<T>,
  showTrailingUtilityColumn?: boolean
): boolean {
  if (showTrailingUtilityColumn === false) return false;
  return columns.some((column) => column.filterable !== false);
}
