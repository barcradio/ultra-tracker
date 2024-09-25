import { ReactNode, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParentHeight } from "~/hooks/useParentRect";
import { classed } from "~/lib/classed";
import { Headers } from "./Headers";
import { FilterState, useFilterState } from "./hooks/useFilterState";
import { InitialSortState, useSortState } from "./hooks/useSortState";
import { TableContent } from "./TableContent";
import { ColumnDef } from "./types";

interface GridClassNames {
  root: string;
  table: string;
  header: string;
  // NOTE: Can add more as needed
}

interface Props<T extends object> {
  data: T[];
  columns: ColumnDef<T>;
  initialSort?: InitialSortState<T>;
  initialFilter?: FilterState<T>;
  onClearFilters?: () => void;
  actionButtons?: (row: T) => ReactNode;
  classNames?: Partial<GridClassNames>;
  getKey?: (row: T) => string | number;
  overscan?: number;
  showFooter?: boolean;
}

const Table = classed.table("overflow-auto w-full table-fixed font-display text-on-component");

export function DataGrid<T extends object>(props: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const height = useParentHeight(parentRef);

  const [compareFn, setSortField, sortState] = useSortState<T>({
    initial: props.initialSort,
    columns: props.columns
  });

  const { filterFn, ...filterState } = useFilterState<T>({
    columns: props.columns,
    initialFilter: props.initialFilter
  });

  // Memoize to prevent re-sorting on every render
  const sortedData = useMemo(() => [...props.data].sort(compareFn), [compareFn, props.data]);
  const filteredData = useMemo(() => sortedData.filter(filterFn), [filterFn, sortedData]);

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: props.overscan ?? 0
  });

  const handleSetSortField = (field: keyof T) => {
    setSortField(field);
    rowVirtualizer.scrollToIndex(0);
  };

  const getSection = (type: "header" | "footer") => {
    return (
      <Headers<T>
        {...filterState}
        type={type}
        columns={props.columns}
        setSortField={handleSetSortField}
        sortState={sortState}
        actionButtons={props.actionButtons}
        className={props.classNames?.header}
        onClearFilters={props.onClearFilters}
      />
    );
  };

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto overflow-x-hidden ${props.classNames?.root}`}
      style={{ height }}
    >
      <div>
        <Table className={props.classNames?.table}>
          {getSection("header")}
          <TableContent<T>
            rowVirtualizer={rowVirtualizer}
            data={filteredData}
            columns={props.columns}
            actionButtons={props.actionButtons}
            getKey={props.getKey}
          />
          {props.showFooter && getSection("footer")}
        </Table>
      </div>
    </div>
  );
}
