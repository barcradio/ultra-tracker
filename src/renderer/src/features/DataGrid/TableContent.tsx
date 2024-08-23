import { ReactNode } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { classed } from "~/lib/classed";
import { useKeyFn } from "./hooks/useKeyFn";
import { useVirtualPadding } from "./hooks/useVirtualPadding";
import { Row } from "./Row";
import { Column } from "./types";

const Cell = classed.td("py-1 px-4 h-full text-sm font-medium text-end", {
  variants: {
    align: {
      right: "text-right",
      left: "text-left"
    }
  }
});

interface Props<T extends object> {
  data: T[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  columns: Column<T>[];
  actionButtons?: (row: T) => ReactNode;
  getKey?: (row: T) => string | number;
}

export function TableContent<T extends object>(props: Props<T>) {
  const getKey = useKeyFn(props.getKey);
  const { paddingTop, paddingBottom } = useVirtualPadding(props.rowVirtualizer);

  const isEven = (index: number) => index % 2 === 0;
  const isLast = (index: number) => index === props.data.length - 1;

  const renderCell = (column: Column<T>, row: T) => {
    if (column.render) return column.render(row[column.field], row);
    if (column.field === null) return "";
    return String(row[column.field]);
  };

  return (
    <tbody className="relative">
      {paddingTop > 0 && (
        <tr>
          <td style={{ height: paddingTop }} />
        </tr>
      )}
      {props.rowVirtualizer.getVirtualItems().map((row) => (
        <Row
          key={getKey(props.data[row.index])}
          even={isEven(row.index)}
          last={isLast(row.index)}
          ref={props.rowVirtualizer.measureElement}
        >
          {props.columns.map((column) => (
            <Cell key={column.name ?? String(column.field)} align={column.align ?? "left"}>
              {renderCell(column, props.data[row.index])}
            </Cell>
          ))}
          {props.actionButtons && (
            <Cell align="right" className="p-0 opacity-0 group-hover:opacity-100 h-inherit">
              {props.actionButtons(props.data[row.index])}
            </Cell>
          )}
        </Row>
      ))}
      {paddingBottom > 0 && (
        <tr>
          <td style={{ height: paddingBottom }} />
        </tr>
      )}
    </tbody>
  );
}
