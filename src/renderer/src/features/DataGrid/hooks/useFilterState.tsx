import { useCallback } from "react";
import { useSessionStorage } from "@uidotdev/usehooks";
import objectHash from "object-hash";
import { formatDate } from "~/lib/datetimes";
import { Column } from "../types";

export type FilterState<T extends object> = Partial<Record<keyof T, string>>;

export function useFilterState<T extends object>({ columns }: { columns: Column<T>[] }) {
  const hash = objectHash(columns.map((column) => column.field));
  const [filters, setFilters] = useSessionStorage<FilterState<T>>(`filter-${hash}`, {});

  const setFilter = useCallback(
    (field: keyof T, filter: string) => {
      setFilters((prev) => ({ ...prev, [field]: filter }));
    },
    [setFilters]
  );

  const removeFilter = useCallback(
    (field: keyof T) => {
      setFilters((prev) => {
        delete prev[field];
        return { ...prev };
      });
    },
    [setFilters]
  );

  const filterFn = useCallback(
    (row: T) => {
      if (Object.keys(filters).length === 0) return true;
      return Object.entries(filters).every(([field, filter]) => {
        const filterField = field as keyof T;
        const filterValue = (filter as string).toLowerCase();
        const fieldValue = row[filterField];

        if (!fieldValue) return false;

        const fieldValueString =
          fieldValue instanceof Date ? formatDate(fieldValue) : String(fieldValue);

        return fieldValueString.toLowerCase().includes(filterValue.toLowerCase());
      });
    },
    [filters]
  );

  return { setFilter, removeFilter, filterFn, filterState: filters };
}
