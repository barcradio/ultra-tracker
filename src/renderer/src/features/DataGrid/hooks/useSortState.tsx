import { useCallback, useMemo } from "react";
import { useSessionStorage } from "@uidotdev/usehooks";
import objectHash from "object-hash";
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
  // NOTE: If two tables have the same columns, they will share the same sort state.
  // If this is a problem in the future we can find some other way to get a unique hash.
  const hash = objectHash(columns.map((column) => column.field));

  const initialField = initial?.field ?? null;
  const initialAscending = initial?.ascending ?? true;
  const [field, setField] = useSessionStorage(`sort-field-${hash}`, initialField);
  const [ascending, setAscending] = useSessionStorage(`sort-ascending-${hash}`, initialAscending);

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

  const givenSortFn = useMemo(
    () => columns.find((column) => column.field === field)?.sortFn,
    [field, columns]
  );

  const compareFn = useCallback(
    (a: T, b: T) => {
      if (field === null) return 0;

      if (givenSortFn) {
        if (ascending) return givenSortFn(a, b);
        return givenSortFn(b, a);
      } else {
        if (ascending) return defaultCompareFn(a, b);
        return defaultCompareFn(b, a);
      }
    },
    [field, givenSortFn, ascending, defaultCompareFn]
  );

  const sortState = { field, ascending };

  return [compareFn, setSort, sortState] as const;
}
