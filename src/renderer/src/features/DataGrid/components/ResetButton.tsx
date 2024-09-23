import { useState } from "react";
import ResetIcon from "~/assets/icons/reset.svg?react";
import { classed } from "~/lib/classed";
import { FilterState } from "../hooks/useFilterState";

interface Props<T extends object> {
  removeFilter: (field?: keyof T) => void;
  filterState: FilterState<T>;
  onClearFilters?: () => void;
}

const Button = classed.button({
  base: "py-1 px-3 transition-all duration-150 ease-in-out text-on-surface hover:text-on-surface-hover",
  variants: {
    spinning: {
      true: "duration-500 animate-spin repeat-1"
    },
    show: {
      true: "opacity-100",
      false: "opacity-0"
    }
  },
  defaultVariants: {
    spinning: false,
    show: true
  }
});

export function ResetButton<T extends object>(props: Props<T>) {
  const [isAnimating, setIsAnimating] = useState(false);

  const onClick = () => {
    setIsAnimating(true);
    props.onClearFilters?.();
    props.removeFilter();
  };

  return (
    <Button
      show={Object.keys(props.filterState).length > 0}
      spinning={isAnimating}
      onClick={() => onClick()}
      onAnimationEnd={() => setIsAnimating(false)}
    >
      <ResetIcon width={18} className="fill-current" height={18} />
    </Button>
  );
}
