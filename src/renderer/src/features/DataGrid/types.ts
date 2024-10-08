import { ReactNode } from "react";

export type Column<T extends object> = {
  [K in keyof T]: {
    field: K;
    name?: string;
    width?: number | string;
    valueFn?: (row: T) => unknown;
    filterable?: boolean;
    sortable?: boolean;
    render?: (value: T[K], row: T) => ReactNode;
    align?: "left" | "right";
    truncate?: boolean;
  };
}[keyof T];

export type ColumnDef<T extends object> = Column<T>[];
