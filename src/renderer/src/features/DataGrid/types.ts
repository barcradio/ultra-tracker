import { ReactNode } from "react";

export type Column<T extends object> = {
  [K in keyof T]: {
    field: K;
    name?: string;
    width?: number | string;
    filterable?: boolean;
    sortable?: boolean;
    sortFn?: (a: T, b: T) => number;
    render?: (value: T[K], row: T) => ReactNode;
    align?: "left" | "right";
  };
}[keyof T];

export type ColumnDef<T extends object> = Column<T>[];
