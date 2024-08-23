import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { classed } from "~/lib/classed";
import { Headers } from "./Headers";
import { InitialSortState, useSortState } from "./hooks/useSortState";
import { TableContent } from "./TableContent";
import { ColumnDef } from "./types";

interface Props<T extends object> {
  data: T[];
  columns: ColumnDef<T>;
  initialSort?: InitialSortState<T>;
  actionButtons?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  getKey?: (row: T) => string | number;
  overscan?: number;
  showFooter?: boolean;
}

const Table = classed.table("overflow-auto w-full font-display text-on-component");

export function DataGrid<T extends object>(props: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [availableSpace, setAvailableSpace] = useState(0);
  const [compareFn, setSortField, sortState] = useSortState<T>({
    initial: props.initialSort,
    columns: props.columns
  });

  // Memoize to prevent re-sorting on every render
  const sortedData = useMemo(() => [...props.data].sort(compareFn), [compareFn, props.data]);

  const rowVirtualizer = useVirtualizer({
    count: props.data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: props.overscan ?? 10
  });

  useLayoutEffect(() => {
    if (!parentRef.current) return;
    setAvailableSpace(parentRef.current?.parentElement?.clientHeight ?? 0);
  }, []);

  const getSection = (type: "header" | "footer") => {
    return (
      <Headers<T>
        type={type}
        data={props.data}
        columns={props.columns}
        setSortField={setSortField}
        sortState={sortState}
        actionButtons={props.actionButtons}
        className={props.headerClassName}
      />
    );
  };

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto overflow-x-hidden"
      style={{ height: availableSpace }}
    >
      <div>
        <Table className={props.className}>
          {getSection("header")}
          <TableContent<T>
            rowVirtualizer={rowVirtualizer}
            data={sortedData}
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
