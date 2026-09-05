import { CSSProperties } from "react";
import { Column } from "./types";

// table-layout:fixed sizes columns strictly from the first row. When every
// column has an explicit `width`, Chromium proportionally inflates them all
// to fill the table's own width (breaking any tight sizing below). So only
// columns with a sizing hint (`width`/`minWidth`/`sample`) get a literal
// `width`; a column with none of those is the intentional "flex" column that
// absorbs leftover space via `min-width` instead, exactly like a normal auto
// table column, while still keeping a readable floor.
const MIN_CHAR_WIDTH = 11;
const MIN_HEADER_PADDING = 52;
const DEFAULT_MIN_WIDTH = 80;

// Data cells render at text-sm font-medium (not bold/uppercase like headers)
// with px-4 (32px total) horizontal padding. A little extra margin is kept
// on top of the raw character estimate so tight samples (e.g. formatted
// dates) don't get clipped by a single character.
const CONTENT_CHAR_WIDTH = 9;
const CONTENT_PADDING = 40;

function toPixels(width: number | string | undefined): number | undefined {
  if (typeof width === "number") return width;
  if (typeof width === "string" && width.endsWith("px")) return parseInt(width, 10);
  return undefined;
}

function computeFloorPx<T extends object>(column: Column<T>): number {
  const explicitPx = toPixels(column.width) ?? 0;
  const minOverridePx = column.minWidth !== undefined ? toPixels(column.minWidth) : undefined;

  // An explicit minWidth is authoritative and should not be pulled up by the
  // generic label/content estimates or default — it means the author already
  // knows the content is reliably a fixed, short size.
  if (minOverridePx !== undefined) return Math.max(minOverridePx, explicitPx);

  return Math.max(
    (column.name ?? String(column.field)).length * MIN_CHAR_WIDTH + MIN_HEADER_PADDING,
    column.sample ? column.sample.length * CONTENT_CHAR_WIDTH + CONTENT_PADDING : 0,
    explicitPx,
    DEFAULT_MIN_WIDTH
  );
}

/** Computes the CSS width/min-width for a DataGrid column, guaranteeing enough
 * room for its header label and (when a `sample` is given) its widest realistic
 * data value. A column is flexible (fills leftover space via `min-width` only)
 * when explicitly marked `flexible: true`, or implicitly when it has no sizing
 * hint at all (no `width`, `minWidth`, or `sample`). */
export function getColumnWidthStyle<T extends object>(column: Column<T>): CSSProperties {
  const floorPx = computeFloorPx(column);
  const isFlex =
    column.flexible ??
    (column.width === undefined && column.minWidth === undefined && !column.sample);

  return isFlex ? { minWidth: `${floorPx}px` } : { width: `${floorPx}px` };
}
