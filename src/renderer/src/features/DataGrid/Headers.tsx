import { ReactNode } from "react";
import ArrowIcon from "~/assets/icons/arrow-up.svg?react";
import { classed } from "~/lib/classed";
import { SortState } from "./hooks/useSortState";
import { Row } from "./Row";
import { Column } from "./types";

const HeaderButton = classed.button(
  "flex justify-between items-center py-2.5 px-4 w-full text-xl font-bold text-left uppercase",
  {
    variants: {
      align: {
        right: "flex-row-reverse",
        left: "flex-row"
      }
    }
  }
);

const SortIcon = classed(ArrowIcon, "absolute px-4 transition duration-200 fill-on-surface", {
  variants: {
    ascending: {
      false: "transform rotate-180"
    },
    active: {
      true: "opacity-100",
      false: "opacity-0"
    },
    align: {
      right: "left-0",
      left: "right-0"
    }
  },
  defaultVariants: {
    align: "right"
  }
});

interface Props<T extends object> {
  data: T[];
  columns: Column<T>[];
  sortState: SortState<T>;
  setSortField: (field: keyof T) => void;
  actionButtons?: (row: T) => ReactNode;
  className?: string;
}

export function Headers<T extends object>(props: Props<T>) {
  const isActive = (field: keyof T) => props.sortState.field === field;

  const width = (width: Column<T>["width"]) => {
    if (typeof width === "number") return `${width}px`;
    return width;
  };

  return (
    <thead className="sticky top-0 z-10">
      <Row>
        {props.columns.map((column) => (
          <th
            key={column.name ?? String(column.field)}
            style={{ width: width(column.width) }}
            className="relative rounded-s bg-component-strong"
          >
            {column.field !== null && (
              <HeaderButton
                className={props.className}
                align={column.align ?? "left"}
                onClick={() => props.setSortField(column.field as keyof T)}
                disabled={column.sortable === false}
                type="button"
              >
                <SortIcon
                  active={isActive(column.field)}
                  ascending={props.sortState.ascending}
                  align={column.align ?? "left"}
                  height={18}
                />
                {column.name ?? String(column.field)}
              </HeaderButton>
            )}
          </th>
        ))}
        {props.actionButtons && <th className="relative bg-component-strong" />}
      </Row>
    </thead>
  );
}
