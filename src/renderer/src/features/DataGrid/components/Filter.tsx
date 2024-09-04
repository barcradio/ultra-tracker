import { MouseEvent, useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import DotsVerticalIcon from "~/assets/icons/dots-vertical.svg?react";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { Column } from "../types";

interface Props<T extends object> {
  column: Column<T>;
}

const FilterButton = classed.button({
  base: "absolute px-4 opacity-0 transition-all duration-150 ease-in-out cursor-pointer fill-current group-hover/header:opacity-100",
  variants: {
    align: {
      right: "left-0",
      left: "right-0"
    }
  }
});

export function Filter<T extends object>(props: Props<T>) {
  const portalRoot = usePortalRoot();
  const panelRef = useRef<OverlayPanel>(null);

  if (props.column.filterable === false) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    panelRef.current?.toggle(event);
    event.stopPropagation();
  };

  return (
    <>
      <OverlayPanel
        ref={panelRef}
        onMouseLeave={(event) => panelRef.current?.toggle(event)}
        appendTo={portalRoot?.current}
      >
        Hello
      </OverlayPanel>
      <FilterButton onClick={handleClick} align={props.column.align ?? "left"}>
        <DotsVerticalIcon className="fill-inherit" width={18} height={18} />
      </FilterButton>
    </>
  );
}
