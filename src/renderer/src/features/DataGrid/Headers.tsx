import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { Filter, Row, Section } from "./components";
import { SortIcon } from "./components/SortIcon";
import { SortState } from "./hooks/useSortState";
import { Column } from "./types";

const HeaderButton = classed.button(
  "flex justify-between items-center py-2.5 px-4 w-full text-xl font-bold text-left uppercase group/header",
  {
    variants: {
      align: {
        right: "flex-row-reverse",
        left: "flex-row"
      }
    }
  }
);

interface Props<T extends object> {
  data: T[];
  columns: Column<T>[];
  sortState: SortState<T>;
  setSortField: (field: keyof T) => void;
  actionButtons?: (row: T) => ReactNode;
  className?: string;
  type: "header" | "footer";
}

export function Headers<T extends object>(props: Props<T>) {
  const width = (width: Column<T>["width"]) => {
    if (typeof width === "number") return `${width}px`;
    return width;
  };

  return (
    <Section type={props.type}>
      <Row>
        {props.columns.map((column) => (
          <th
            key={column.name ?? String(column.field)}
            style={{ width: width(column.width) }}
            className="relative rounded-s bg-component-strong"
          >
            <HeaderButton
              className={props.className}
              align={column.align ?? "left"}
              onClick={() => props.setSortField(column.field as keyof T)}
              disabled={column.sortable === false || props.type === "footer"}
              type="button"
            >
              {props.type === "header" && (
                <>
                  <SortIcon column={column} sortState={props.sortState} />
                  <Filter data={props.data} column={column} />
                </>
              )}
              {column.name ?? String(column.field)}
            </HeaderButton>
          </th>
        ))}
        {props.actionButtons && <th className="relative bg-component-strong" />}
      </Row>
    </Section>
  );
}
