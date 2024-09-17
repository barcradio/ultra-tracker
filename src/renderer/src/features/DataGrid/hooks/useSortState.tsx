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

  const compareFn = useCallback(
    (a: unknown, b: unknown) => {
      if (field === null) return 0;
      if (a === b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a > b ? 1 : -1;
    },
    [field]
  );

  const valueFn = useMemo(
    () => columns.find((column) => column.field === field)?.valueFn,
    [field, columns]
  );

  const sortFn = useCallback(
    (a: T, b: T) => {
      if (field === null) return 0;

      if (valueFn) {
        if (ascending) return compareFn(valueFn(a), valueFn(b));
        return compareFn(valueFn(b), valueFn(a));
      } else {
        if (ascending) return compareFn(a[field], b[field]);
        return compareFn(b[field], a[field]);
      }
    },
    [field, valueFn, ascending, compareFn]
  );

  const sortState = { field, ascending };

  return [sortFn, setSort, sortState] as const;
}
