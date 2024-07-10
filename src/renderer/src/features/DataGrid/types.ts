import { ReactNode } from "react";

export type WithId = { id: string | number };

export interface Column<T extends WithId> {
  field: keyof T;
  name: string;
  width?: number | string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
}

export type ColumnDef<T extends WithId> = Column<T>[];
