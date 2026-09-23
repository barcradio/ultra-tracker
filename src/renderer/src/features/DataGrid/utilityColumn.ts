import { ColumnDef } from "./types";

export function shouldShowTrailingUtilityColumn<T extends object>(
  _columns: ColumnDef<T>,
  showTrailingUtilityColumn?: boolean
): boolean {
  return showTrailingUtilityColumn !== false;
}
