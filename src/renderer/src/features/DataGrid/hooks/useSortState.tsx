import { useCallback, useState } from "react";
import { ColumnDef } from "../types";

export type InitialSortState<T extends object> = Partial<SortState<T>>;

export interface SortState<T extends object> {
  field: keyof T | null;
  ascending: boolean;
}

interface Props<T extends object> {
  columns: ColumnDef<T>;
  initial?: InitialSortState<T>;
}

export function useSortState<T extends object>({ initial, columns }: Props<T>) {
  const [field, setField] = useState<keyof T | null>(initial?.field ?? null);
  const [ascending, setAscending] = useState(initial?.ascending ?? true);

  const setSort = (newField: keyof T) => {
    if (field === newField) {
      setAscending(!ascending);
    } else {
      setField(newField);
      setAscending(false);
    }
  };

  const defaultCompareFn = useCallback(
    (a: T, b: T) => {
      if (field === null) return 0;
      const aValue = a[field];
      const bValue = b[field];
      if (aValue === bValue) return 0;
      return aValue > bValue ? 1 : -1;
    },
    [field]
  );

  const compareFn = useCallback(
    (a: T, b: T) => {
      if (field === null) return 0;

      const givenSortFn = columns.find((column) => column.field === field)?.sortFn;

      if (givenSortFn) {
        if (ascending) return givenSortFn(a, b);
        return givenSortFn(b, a);
      } else {
        if (ascending) return defaultCompareFn(a, b);
        return defaultCompareFn(b, a);
      }
    },
    [field, columns, ascending, defaultCompareFn]
  );

  const sortState = { field, ascending };

  return [compareFn, setSort, sortState] as const;
}
