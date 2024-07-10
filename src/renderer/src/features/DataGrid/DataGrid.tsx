import { classed } from "~/lib/classed";
import { Headers } from "./Headers";
import { TableContent } from "./TableContent";
import { Column, WithId } from "./types";

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
}

const Table = classed.table("w-full font-display", {});

export function DataGrid<T extends WithId>(props: Props<T>) {
  return (
    <Table>
      <Headers data={props.data} columns={props.columns} />
      <TableContent data={props.data} columns={props.columns} />
    </Table>
  );
}
