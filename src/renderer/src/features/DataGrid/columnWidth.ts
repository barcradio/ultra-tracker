import { Column } from "./types";

// table-layout:fixed sizes columns strictly from the first row's `width`
// (min-width is ignored by Chromium), so every DataGrid column must get an
// explicit width that already accounts for a readable floor. Centralizing
// that calculation here keeps all pages consistent without per-page tuning.
const MIN_CHAR_WIDTH = 11;
const MIN_HEADER_PADDING = 72;
const DEFAULT_MIN_WIDTH = 90;

function toPixels(width: number | string | undefined): number {
  if (typeof width === "number") return width;
  if (typeof width === "string" && width.endsWith("px")) return parseInt(width, 10);
  return 0;
}

/** Computes the CSS width (in px) for a DataGrid column, guaranteeing enough
 * room for its header label regardless of any percentage/auto width supplied.
 * Columns can opt out of the label-based estimate via `minWidth` when the
 * author knows the content is reliably short (e.g. a 4-digit numeric field). */
export function getColumnWidth<T extends object>(column: Column<T>): string {
  const explicitPx = toPixels(column.width);
  if (column.minWidth !== undefined) {
    return `${Math.max(explicitPx, toPixels(column.minWidth))}px`;
  }
  const label = column.name ?? String(column.field);
  const labelMin = label.length * MIN_CHAR_WIDTH + MIN_HEADER_PADDING;
  return `${Math.max(labelMin, explicitPx, DEFAULT_MIN_WIDTH)}px`;
}
