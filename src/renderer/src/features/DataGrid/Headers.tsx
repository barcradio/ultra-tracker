import ArrowIcon from "~/assets/icons/arrow-up.svg?react";
import { classed } from "~/lib/classed";
import { SortState } from "./hooks/useSortState";
import { Row } from "./Row";
import { Column, WithId } from "./types";

const HeaderButton = classed.button(
  "flex justify-between items-center py-2.5 w-full text-xl font-bold text-left",
  {
    variants: {
      number: {
        true: "flex-row-reverse pr-8",
        false: "flex-row"
      }
    }
  }
);

const SortIcon = classed(ArrowIcon, "absolute px-4 transition duration-200", {
  variants: {
    ascending: {
      false: "transform rotate-180"
    },
    active: {
      true: "opacity-100",
      false: "opacity-0"
    },
    left: {
      true: "left-0",
      false: "right-0"
    }
  }
});

interface Props<T extends WithId> {
  data: T[];
  columns: Column<T>[];
  sortState: SortState<T>;
  setSortField: (field: keyof T) => void;
}

export function Headers<T extends WithId>(props: Props<T>) {
  const isNumber = (key: keyof T) => typeof props.data[0][key] === "number";
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
          className="relative rounde-s bg-surface-higher"
        >
          <HeaderButton
            number={isNumber(column.field)}
            onClick={() => props.setSortField(column.field)}
            disabled={column.sortable === false}
            type="button"
            className="uppercase"
          >
            <SortIcon
              active={isActive(column.field)}
              ascending={props.sortState.ascending}
              left={isNumber(column.field)}
              className="fill-on-surface-low"
              height={18}
            />
            {column.name}
          </HeaderButton>
        </th>
      ))}
    </Row>
  );
}
