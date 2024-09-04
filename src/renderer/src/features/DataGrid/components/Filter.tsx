import { MouseEvent, useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import DotsVerticalIcon from "~/assets/icons/dots-vertical.svg?react";
import { Button } from "~/components";
import { Column } from "../types";

interface Props<T extends object> {
  data: T[];
  column: Column<T>;
}

export function Filter<T extends object>(props: Props<T>) {
  const panelRef = useRef<OverlayPanel>(null);

  if (props.column.filterable === false) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    panelRef.current?.toggle(event);
    event.stopPropagation();
  };

  return (
    <>
      <OverlayPanel ref={panelRef}>Hello</OverlayPanel>
      <Button
        variant="ghost"
        color="neutral"
        size="xs"
        onClick={handleClick}
        className="opacity-0 group-hover/header:opacity-100"
      >
        <DotsVerticalIcon className="fill-inherit" width={18} height={18} />
      </Button>
    </>
  );
}
