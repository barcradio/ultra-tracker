import { ReactNode } from "react";
import { classed } from "~/lib/classed";
import { getColumnWidth } from "./columnWidth";
import { Filter, Row, Section } from "./components";
import { ResetButton } from "./components/ResetButton";
import { SortIcon } from "./components/SortIcon";
import { FilterState } from "./hooks/useFilterState";
import { SortState } from "./hooks/useSortState";
import { Column } from "./types";

const HeaderContainer = classed.div(
  "flex gap-1 sm:gap-2 md:gap-3 justify-end items-center py-2.5 px-2 sm:px-3 md:px-4 w-full text-xl font-bold text-left uppercase group/header min-w-0 truncate",
  {
    variants: {
      disabled: {
        true: "cursor-default",
        false: "cursor-pointer"
      },
      align: {
        right: "flex-row",
        left: "flex-row-reverse"
      }
    }
  }
);

interface Props<T extends object> {
  columns: Column<T>[];
  filterState: FilterState<T>;
  setFilter: (field: keyof T, filter: string) => void;
  onClearFilters?: () => void;
  removeFilter: (field?: keyof T) => void;
  sortState: SortState<T>;
  setSortField: (field: keyof T) => void;
  actionButtons?: (row: T) => ReactNode;
  className?: string;
  type: "header" | "footer";
  hasRowStatus?: boolean;
}

export function Headers<T extends object>(props: Props<T>) {
  const isDisabled = (column: Column<T>) => column.sortable === false || props.type === "footer";

  return (
    <Section type={props.type}>
      <Row>
        {props.hasRowStatus && (
          <th aria-label="OpenSplitTime upload status" className="w-4 text-center">
            ↑
          </th>
        )}
        {props.columns.map((column) => (
          <th
            key={column.name ?? String(column.field)}
            style={{ width: getColumnWidth(column) }}
            className="relative rounded-s bg-component-strong"
          >
            <HeaderContainer
              className={`header-container ${props.className}`}
              align={column.align ?? "left"}
              disabled={isDisabled(column)}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                if (isDisabled(column)) return;
                props.setSortField(column.field as keyof T);
              }}
            >
              {props.type === "header" && (
                <>
                  <Filter column={column} {...props} />
                  <SortIcon column={column} sortState={props.sortState} />
                </>
              )}
              {column.name ?? String(column.field)}
            </HeaderContainer>
          </th>
        ))}
        <th className="relative text-right bg-component-strong" style={{ width: "3%" }}>
          {props.type === "header" && (
            <ResetButton
              removeFilter={props.removeFilter}
              filterState={props.filterState}
              onClearFilters={props.onClearFilters}
            />
          )}
        </th>
      </Row>
    </Section>
  );
}
