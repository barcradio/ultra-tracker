import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { Filter, Row, Section } from "./components";
import { SortIcon } from "./components/SortIcon";
import { SortState } from "./hooks/useSortState";
import { Column } from "./types";

const HeaderContainer = classed.button(
  "flex gap-3 justify-end items-center py-2.5 px-4 w-full text-xl font-bold text-left uppercase group/header",
  {
    variants: {
      align: {
        right: "flex-row",
        left: "flex-row-reverse"
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
            <HeaderContainer
              className={props.className}
              align={column.align ?? "left"}
              onClick={() => props.setSortField(column.field as keyof T)}
              disabled={column.sortable === false || props.type === "footer"}
              type="button"
            >
              {props.type === "header" && (
                <>
                  <Filter column={column} />
                  <SortIcon column={column} sortState={props.sortState} />
                </>
              )}
              {column.name ?? String(column.field)}
            </HeaderContainer>
          </th>
        ))}
        {props.actionButtons && <th className="relative bg-component-strong" />}
      </Row>
    </Section>
  );
}
