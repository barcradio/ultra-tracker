import { ReactNode } from "react";

export type RowStatus = "success" | "pending" | "error" | "exported" | "not-exported";

export type Column<T extends object> = {
  [K in keyof T]: {
    field: K;
    name?: string;
    width?: number | string;
    /** Overrides the automatic label-based minimum width (see columnWidth.ts). */
    minWidth?: number | string;
    /** A representative string of the widest value this column ever renders
     * (e.g. "10:56:50 04 Sep" for a date, "Duplicate" for a status badge).
     * Used by columnWidth.ts to size the column to its actual data instead
     * of guessing a pixel width. */
    sample?: string;
    /** Marks this as the page's one column that fills leftover space instead
     * of a fixed width. Combine with `sample` to give it a real content-based
     * floor instead of just the (usually much smaller) header-label floor. */
    flexible?: boolean;
    valueFn?: (row: T) => unknown;
    filterable?: boolean;
    sortable?: boolean;
    render?: (value: T[K], row: T) => ReactNode;
    align?: "left" | "right";
    truncate?: boolean;
  };
}[keyof T];

export type ColumnDef<T extends object> = Column<T>[];
