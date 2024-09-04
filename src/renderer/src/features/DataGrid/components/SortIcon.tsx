import ArrowIcon from "~/assets/icons/arrow-up.svg?react";
import { classed } from "~/lib/classed";
import { SortState } from "../hooks/useSortState";
import { Column } from "../types";

interface Props<T extends object> {
  column: Column<T>;
  sortState: SortState<T>;
}

const Icon = classed(ArrowIcon, "absolute px-4 transition duration-200 fill-on-surface", {
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

export function SortIcon<T extends object>(props: Props<T>) {
  if (!props.column.sortable) return null;

  const isActive = (field: keyof T) => props.sortState.field === field;

  return (
    <Icon
      active={isActive(props.column.field)}
      ascending={props.sortState.ascending}
      align={props.column.align ?? "left"}
      height={18}
    />
  );
}
