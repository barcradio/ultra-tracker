import { MouseEvent, useEffect, useRef, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { OverlayPanel } from "primereact/overlaypanel";
import DotsVerticalIcon from "~/assets/icons/dots-vertical.svg?react";
import { TextInput } from "~/components";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { FilterState } from "../hooks/useFilterState";
import { Column } from "../types";

interface Props<T extends object> {
  column: Column<T>;
  filterState: FilterState<T>;
  setFilter: (field: keyof T, filter: string) => void;
  removeFilter: (field: keyof T) => void;
}

const FilterButton = classed.button({
  base: "absolute px-4 opacity-0 transition-all duration-150 ease-in-out cursor-pointer fill-current text-on-surface group-hover/header:opacity-100 hover:text-on-surface-hover",
  variants: {
    align: {
      right: "left-0",
      left: "right-0"
    },
    active: {
      true: "opacity-100 text-on-surface-hover"
    }
  }
});

export function Filter<T extends object>(props: Props<T>) {
  const { column, setFilter, removeFilter } = props;
  const portalRoot = usePortalRoot();
  const panelRef = useRef<OverlayPanel>(null);

  const [value, setValue] = useState(props.filterState[column.field] ?? "");
  const debouncedValue = useDebounce(value, 300);
  const [open, setOpen] = useState(false);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setOpen(!open);
    panelRef.current?.toggle(event);
    event.stopPropagation();
  };

  useEffect(() => {
    if (debouncedValue === "") {
      removeFilter(column.field);
    } else {
      setFilter(column.field, debouncedValue);
    }
  }, [column.field, debouncedValue, removeFilter, setFilter]);

  if (column.filterable === false) return null;

  return (
    <>
      <OverlayPanel ref={panelRef} appendTo={portalRoot?.current} showCloseIcon>
        <TextInput
          label={`${column.name ?? String(column.field)} Contains`}
          labelProps={{ className: "text-sm" }}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Filter"
        />
      </OverlayPanel>
      <FilterButton onClick={handleOpen} align={column.align ?? "left"} active={open}>
        <DotsVerticalIcon className="fill-inherit" width={18} height={18} />
      </FilterButton>
    </>
  );
}
