export type WithId = { id: string | number };

export type ColumnDef<T extends WithId> = Column<T>[];

export interface Column<T extends WithId> {
  field: keyof T;
  name: string;
  width?: number;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}
