import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { useKeyFn } from "./hooks/useKeyFn";
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
  columns: Column<T>[];
  actionButtons?: (row: T) => ReactNode;
  getKey?: (row: T) => string | number;
}

export function TableContent<T extends object>(props: Props<T>) {
  const getKey = useKeyFn(props.getKey);
  const isEven = (index: number) => index % 2 === 0;
  const isLast = (index: number) => index === props.data.length - 1;

  const renderCell = (column: Column<T>, row: T) => {
    if (column.render) return column.render(row[column.field], row);
    if (column.field === null) return "";
    return String(row[column.field]);
  };

  return (
    <tbody>
      {props.data.map((row, rowIndex) => (
        <Row key={getKey(row)} even={isEven(rowIndex)} last={isLast(rowIndex)}>
          {props.columns.map((column) => (
            <Cell key={column.name} align={column.align ?? "left"}>
              {renderCell(column, row)}
            </Cell>
          ))}
          {props.actionButtons && (
            <Cell align="right" className="p-0 opacity-0 group-hover:opacity-100 h-inherit">
              {props.actionButtons(row)}
            </Cell>
          )}
        </Row>
      ))}
    </tbody>
  );
}
