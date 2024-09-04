import ArrowIcon from "~/assets/icons/arrow-up.svg?react";
import { classed } from "~/lib/classed";
import { SortState } from "../hooks/useSortState";
import { Column } from "../types";

interface Props<T extends object> {
  column: Column<T>;
  sortState: SortState<T>;
}

const Icon = classed(ArrowIcon, "transition duration-200 fill-on-surface", {
  variants: {
    ascending: {
      false: "transform rotate-180"
    },
    active: {
      true: "opacity-100",
      false: "opacity-0"
    }
  }
});

export function SortIcon<T extends object>(props: Props<T>) {
  if (props.column.sortable === false) return null;

  const isActive = (field: keyof T) => props.sortState.field === field;

  return (
    <Icon active={isActive(props.column.field)} ascending={props.sortState.ascending} height={18} />
  );
}
