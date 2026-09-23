import { ColumnDef } from "./types";

export function shouldShowTrailingUtilityColumn<T extends object>(
  columns: ColumnDef<T>,
  showTrailingUtilityColumn?: boolean
): boolean {
  const hasFilterControls = columns.some((column) => column.filterable !== false);
  return showTrailingUtilityColumn !== false || hasFilterControls;
}
