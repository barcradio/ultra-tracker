import { ReactNode } from "react";
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
}

const Table = classed.table("w-full font-display text-on-component", {});

export function DataGrid<T extends object>(props: Props<T>) {
  const [compareFn, setSortField, sortState] = useSortState<T>({
    initial: props.initialSort,
    columns: props.columns
  });

  const sortedData = [...props.data].sort(compareFn);

  return (
    <Table className={props.className}>
      <Headers<T>
        data={props.data}
        columns={props.columns}
        setSortField={setSortField}
        sortState={sortState}
        actionButtons={props.actionButtons}
        className={props.headerClassName}
      />
      <TableContent<T>
        data={sortedData}
        columns={props.columns}
        actionButtons={props.actionButtons}
        getKey={props.getKey}
      />
    </Table>
  );
}
