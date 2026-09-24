import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParentHeight } from "~/hooks/useParentRect";
import { classed } from "~/lib/classed";
import { Headers } from "./Headers";
import { FilterState, useFilterState } from "./hooks/useFilterState";
import { InitialSortState, useSortState } from "./hooks/useSortState";
import { TableContent } from "./TableContent";
import { ColumnDef, FilterSortRule, RowStatus } from "./types";
import { shouldShowResetButton, shouldShowTrailingUtilityColumn } from "./utilityColumn";

interface GridClassNames {
  root: string;
  table: string;
  header: string;
  // NOTE: Can add more as needed
}

interface Props<T extends object> {
  data: T[];
  columns: ColumnDef<T>;
  initialSort?: InitialSortState<T>;
  initialFilter?: FilterState<T>;
  filterSortRule?: FilterSortRule<T>;
  onClearFilters?: () => void;
  actionButtons?: (row: T) => ReactNode;
  leadingAction?: (row: T) => ReactNode;
  leadingActionAlwaysVisible?: (row: T) => boolean;
  classNames?: Partial<GridClassNames>;
  getKey?: (row: T) => string | number;
  overscan?: number;
  showFooter?: boolean;
  rowStatus?: (row: T) => RowStatus;
  rowClassName?: (row: T) => string | undefined;
  showTrailingUtilityColumn?: boolean;
}

const Table = classed.table("overflow-auto w-full font-display text-on-component");

export function DataGrid<T extends object>(props: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const measuredHeight = useParentHeight(parentRef);
  const height = measuredHeight || 320;

  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const showUtilityColumn = shouldShowTrailingUtilityColumn(props.showTrailingUtilityColumn);
  const showResetButton = shouldShowResetButton(props.columns, props.showTrailingUtilityColumn);

  const [compareFn, setSortField, sortState, setSortState] = useSortState<T>({
    initial: props.initialSort,
    columns: props.columns
  });

  const { filterFn, ...filterState } = useFilterState<T>({
    columns: props.columns,
    initialFilter: props.initialFilter
  });

  const ruleFilter = props.filterSortRule
    ? (filterState.filterState[props.filterSortRule.field] ?? "")
    : "";

  useEffect(() => {
    const rule = props.filterSortRule;
    if (!rule || !ruleFilter.toLowerCase().startsWith(rule.match.toLowerCase())) return;

    setSortState(rule.sort.field, rule.sort.ascending);
    // Re-sorting on every sortState change would fight the operator's own header clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleFilter]);

  // Memoize to prevent re-sorting on every render
  const sortedData = useMemo(() => [...props.data].sort(compareFn), [compareFn, props.data]);
  const filteredData = useMemo(() => sortedData.filter(filterFn), [filterFn, sortedData]);

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: props.overscan ?? 0,
    useFlushSync: false,
    useAnimationFrameWithResizeObserver: true
  });

  const scrollToIndex = (index: number) => {
    rowVirtualizer.scrollToIndex(index, { align: "center" });
    setHighlightIndex(index);
  };

  useEffect(() => {
    if (highlightIndex === null) return;

    const timer = setTimeout(() => setHighlightIndex(null), 1500);

    return () => clearTimeout(timer);
  }, [highlightIndex]);

  const handleSetSortField = (field: keyof T) => {
    setSortField(field);
    rowVirtualizer.scrollToIndex(0);
  };

  const getSection = (type: "header" | "footer") => {
    return (
      <Headers<T>
        {...filterState}
        type={type}
        columns={props.columns}
        setSortField={handleSetSortField}
        sortState={sortState}
        actionButtons={props.actionButtons}
        leadingAction={props.leadingAction}
        className={props.classNames?.header}
        onClearFilters={props.onClearFilters}
        hasRowStatus={Boolean(props.rowStatus)}
        showTrailingUtilityColumn={showUtilityColumn}
        showResetButton={showResetButton}
      />
    );
  };

  return (
    <div
      ref={parentRef}
      className={`w-full overflow-y-auto overflow-x-auto ${props.classNames?.root ?? ""}`}
      style={{ height }}
    >
      <div className="w-full min-w-0">
        <Table className={`w-full ${props.classNames?.table ?? ""}`}>
          {getSection("header")}
          <TableContent<T>
            rowVirtualizer={rowVirtualizer}
            scrollToIndex={scrollToIndex}
            setFilter={filterState.setFilter}
            highlightIndex={highlightIndex}
            data={filteredData}
            columns={props.columns}
            actionButtons={props.actionButtons}
            leadingAction={props.leadingAction}
            leadingActionAlwaysVisible={props.leadingActionAlwaysVisible}
            rowStatus={props.rowStatus}
            rowClassName={props.rowClassName}
            getKey={props.getKey}
            showTrailingUtilityColumn={showUtilityColumn}
          />
          {props.showFooter && getSection("footer")}
        </Table>
      </div>
    </div>
  );
}
