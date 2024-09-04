import { MouseEvent, useRef, useState } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import DotsVerticalIcon from "~/assets/icons/dots-vertical.svg?react";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { Column } from "../types";

interface Props<T extends object> {
  column: Column<T>;
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
  const portalRoot = usePortalRoot();
  const panelRef = useRef<OverlayPanel>(null);
  const [open, setOpen] = useState(false);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setOpen(!open);
    panelRef.current?.toggle(event);
    event.stopPropagation();
  };

  const handleClose = () => {
    setOpen(false);
    panelRef.current?.hide();
  };

  if (props.column.filterable === false) return null;

  return (
    <>
      <OverlayPanel ref={panelRef} onMouseLeave={handleClose} appendTo={portalRoot?.current}>
        Hello
      </OverlayPanel>
      <FilterButton onClick={handleOpen} align={props.column.align ?? "left"} active={open}>
        <DotsVerticalIcon className="fill-inherit" width={18} height={18} />
      </FilterButton>
    </>
  );
}
