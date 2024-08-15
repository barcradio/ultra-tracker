import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { Headers } from "./Headers";
import { InitialSortState, useSortState } from "./hooks/useSortState";
import { TableContent } from "./TableContent";
import { ColumnDef, WithId } from "./types";

interface Props<T extends WithId> {
  data: T[];
  columns: ColumnDef<T>;
  initialSort?: InitialSortState<T>;
  actionButtons?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

const Table = classed.table("w-full font-display text-on-component", {});

export function DataGrid<T extends WithId>(props: Props<T>) {
  const [compareFn, setSortField, sortState] = useSortState<T>(props.initialSort);
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
      />
    </Table>
  );
}