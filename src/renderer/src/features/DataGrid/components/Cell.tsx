import { useId } from "react";
import { Tooltip } from "primereact/tooltip";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { useTruncated } from "~/hooks/dom/useTruncated";
import { classed } from "~/lib/classed";

export const CellWrapper = classed.td(
  "overflow-hidden py-1 px-4 h-full text-sm font-medium text-end truncate",
  {
    variants: {
      align: {
        right: "text-right",
        left: "text-left"
      }
    }
  }
);

interface CellProps {
  children: React.ReactNode;
  align: "left" | "right";
}

export function Cell(props: CellProps) {
  const portalRoot = usePortalRoot();

  const rawId = useId();
  const cellId = `cell-${rawId.replace(/:/g, "")}`;

  const [cellRef, truncated] = useTruncated<HTMLTableCellElement>(props.children);

  return (
    <CellWrapper align={props.align} ref={cellRef} className={cellId}>
      {props.children}
      {truncated && (
        <Tooltip
          position="top"
          target={`.${cellId}`}
          appendTo={portalRoot?.current}
          pt={{ text: { className: "text-sm" } }}
        >
          {props.children}
        </Tooltip>
      )}
    </CellWrapper>
  );
}
