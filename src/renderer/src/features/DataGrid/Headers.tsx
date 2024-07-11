import ArrowIcon from "~/assets/icons/arrow-up.svg?react";
import { classed } from "~/lib/classed";
import { SortState } from "./hooks/useSortState";
import { Row } from "./Row";
import { Column, WithId } from "./types";

const HeaderButton = classed.button(
  "flex justify-between items-center py-2.5 w-full text-xl font-bold text-left",
  {
    variants: {
      align: {
        right: "flex-row-reverse pr-8",
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

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
  sortState: SortState<T>;
  setSortField: (field: keyof T) => void;
}

export function Headers<T extends WithId>(props: Props<T>) {
  const isActive = (field: keyof T) => props.sortState.field === field;

  const width = (width: Column<T>["width"]) => {
    if (typeof width === "number") return `${width}px`;
    return width;
  };

  return (
    <Row>
      {props.columns.map((column) => (
        <th
          key={column.name}
          style={{ width: width(column.width) }}
          className="relative rounde-s bg-component-strong"
        >
          <HeaderButton
            align={column.align ?? "left"}
            onClick={() => props.setSortField(column.field)}
            disabled={column.sortable === false}
            type="button"
            className="uppercase"
          >
            <SortIcon
              active={isActive(column.field)}
              ascending={props.sortState.ascending}
              align={column.align ?? "left"}
              height={18}
            />
            {column.name}
          </HeaderButton>
        </th>
      ))}
    </Row>
  );
}
