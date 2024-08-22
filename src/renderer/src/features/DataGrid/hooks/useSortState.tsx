import { useCallback, useState } from "react";
import { WithId } from "../types";

export type InitialSortState<T extends object> = Partial<SortState<T>>;

export interface SortState<T extends object> {
  field: keyof T | null;
  ascending: boolean;
}

export const useSortState = <T extends object>(initial?: InitialSortState<T>) => {
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

  const compareFn = useCallback(
    (a: T, b: T) => {
      if (field === null) return 0;

      const aValue = a[field];
      const bValue = b[field];

      if (aValue === bValue) return 0;

      if (ascending) {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    },
    [field, ascending]
  );

  const sortState = { field, ascending };

  return [compareFn, setSort, sortState] as const;
};
