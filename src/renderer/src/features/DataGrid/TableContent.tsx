import { ReactNode } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { Cell, CellWrapper, Row } from "./components";
import { useKeyFn } from "./hooks/useKeyFn";
import { useVirtualPadding } from "./hooks/useVirtualPadding";
import { Column, RowStatus } from "./types";

interface Props<T extends object> {
  data: T[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  columns: Column<T>[];
  actionButtons?: (row: T) => ReactNode;
  getKey?: (row: T) => string | number;
  rowStatus?: (row: T) => RowStatus;
}

export function TableContent<T extends object>(props: Props<T>) {
  const getKey = useKeyFn(props.getKey);
  const { paddingTop, paddingBottom } = useVirtualPadding(props.rowVirtualizer);

  const isEven = (index: number) => index % 2 === 0;
  const isLast = (index: number) => index === props.data.length - 1;

  const statusClass = (status: RowStatus) => {
    if (status === "success") return "bg-success";
    if (status === "error") return "bg-danger";
    if (status === "pending") return "bg-[#FBBE00]";
    if (status === "exported") return "border-2 border-success";
    return "border-2 border-gray-500";
  };

  const statusLabel = (status: RowStatus) => {
    if (status === "success") return "Uploaded";
    if (status === "error") return "Upload failed";
    if (status === "pending") return "Pending upload";
    if (status === "exported") return "Exported";
    return "Not exported";
  };

  const renderCell = (column: Column<T>, row: T) => {
    if (column.render) return column.render(row[column.field], row);
    if (column.valueFn) return String(column.valueFn(row));
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
          data-index={row.index}
          key={getKey(props.data[row.index])}
          even={isEven(row.index)}
          last={isLast(row.index)}
          ref={props.rowVirtualizer.measureElement}
        >
          {props.rowStatus &&
            (() => {
              const status = props.rowStatus(props.data[row.index]);
              const label = statusLabel(status);

              return (
                <td className="w-4 px-1" aria-label={label} title={label}>
                  <span
                    className={`block h-3 w-3 rounded-full ${statusClass(status)}`}
                    aria-hidden="true"
                  />
                </td>
              );
            })()}
          {props.columns.map((column) => (
            <Cell
              key={column.name ?? String(column.field)}
              align={column.align ?? "left"}
              truncate={column.truncate !== false}
            >
              {renderCell(column, props.data[row.index])}
            </Cell>
          ))}
          {!props.actionButtons && <CellWrapper />}
          {props.actionButtons && (
            <CellWrapper
              truncate={false}
              align="right"
              className="p-0 pr-4 opacity-0 h-inherit group-hover/row:opacity-100"
            >
              {props.actionButtons(props.data[row.index])}
            </CellWrapper>
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
