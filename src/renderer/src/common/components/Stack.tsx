import { classed } from "~/lib/classed";

export const Stack = classed("div", {
  base: "flex",
  variants: {
    direction: {
      row: "flex-row",
      col: "flex-col"
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch"
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around"
    }
  },
  defaultVariants: {
    direction: "row",
    align: "start",
    justify: "start"
  }
});
