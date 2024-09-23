import { useCallback, useEffect } from "react";
import { useSessionStorage } from "@uidotdev/usehooks";
import objectHash from "object-hash";
import { formatDate } from "~/lib/datetimes";
import { Column } from "../types";

export type FilterState<T extends object> = Partial<Record<keyof T, string>>;

interface Params<T extends object> {
  columns: Column<T>[];
  initialFilter?: FilterState<T>;
}

export function useFilterState<T extends object>(params: Params<T>) {
  const { columns, initialFilter } = params;
  const hash = objectHash(columns.map((column) => column.field));
  const [filters, setFilters] = useSessionStorage<FilterState<T>>(`filter-${hash}`, {});

  useEffect(() => {
    // If initial filter is provided, set it after session storage is loaded
    if (initialFilter) setFilters(initialFilter);
  }, [initialFilter, setFilters, hash]);

  const setFilter = useCallback(
    (field: keyof T, filter: string) => {
      setFilters((prev) => ({ ...prev, [field]: filter }));
    },
    [setFilters]
  );

  const removeFilter = useCallback(
    (field?: keyof T) => {
      if (!field) return setFilters({});
      setFilters((prev) => {
        if (prev && field in prev) delete prev[field];
        return { ...prev };
      });
    },
    [setFilters]
  );

  const performFilter = useCallback((value: unknown, filterValue: string) => {
    if (!value) return false;

    const fieldString = value instanceof Date ? formatDate(value) : String(value);

    return fieldString.toLowerCase().includes(filterValue.toLowerCase());
  }, []);

  const filterFn = useCallback(
    (row: T) => {
      if (Object.keys(filters).length === 0) return true;
      return Object.entries(filters).every(([field, filter]) => {
        // Get basic field value from row
        const fieldValue = row[field as keyof T];
        const valueFn = columns.find((column) => column.field === field)?.valueFn;
        // If no value or value getter, filter fails
        if (!fieldValue && !valueFn) return false;

        // If value getter is present, use it to get value
        const value = valueFn ? valueFn(row) : fieldValue;

        // Perform filter on value
        return performFilter(value, filter as string);
      });
    },
    [filters, performFilter, columns]
  );

  return { setFilter, removeFilter, filterFn, filterState: filters };
}
