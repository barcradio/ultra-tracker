import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { Row } from "./Row";
import { Column, WithId } from "./types";

const Cell = classed.td("py-1 px-4 h-full text-sm font-medium text-end", {
  variants: {
    align: {
      right: "text-right",
      left: "text-left"
    }
  }
});

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
  actionButtons?: (row: T) => ReactNode;
}

export function TableContent<T extends WithId>(props: Props<T>) {
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
        <Row key={row.id} even={isEven(rowIndex)} last={isLast(rowIndex)}>
          {props.columns.map((column) => (
            <Cell key={column.name} align={column.align ?? "left"}>
              {renderCell(column, row)}
            </Cell>
          ))}
          {props.actionButtons && (
            <Cell align="right" className="p-0 h-inherit">
              <div className="hidden h-full transition-none group-hover:block">
                {props.actionButtons(row)}
              </div>
            </Cell>
          )}
        </Row>
      ))}
    </tbody>
  );
}
