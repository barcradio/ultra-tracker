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

  const defaultFilterFn = useCallback((row: T, field: keyof T, filterValue: string) => {
    const columnValue = row[field];
    if (!columnValue) return false;

    const fieldString = columnValue instanceof Date ? formatDate(columnValue) : String(columnValue);

    return fieldString.toLowerCase().includes(filterValue.toLowerCase());
  }, []);

  const filterFn = useCallback(
    (row: T) => {
      if (Object.keys(filters).length === 0) return true;
      return Object.entries(filters).every(([field, filter]) => {
        const columnValue = row[field as keyof T];
        if (!columnValue) return false;

        const columnFilterFn = columns.find((column) => column.field === field)?.filterFn;

        if (columnFilterFn) return columnFilterFn(filter as string, columnValue as T[keyof T], row);
        return defaultFilterFn(row, field as keyof T, filter as string);
      });
    },
    [filters, defaultFilterFn, columns]
  );

  return { setFilter, removeFilter, filterFn, filterState: filters };
}
