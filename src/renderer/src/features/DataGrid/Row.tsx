import { classed } from "~/lib/classed";

export const Row = classed.tr("duration-75 transition-color hover:bg-component-hover", {
  variants: {
    even: {
      false: "bg-component",
      true: "bg-component-secondary"
    },
    last: {
      true: "rounded"
    }
  }
});
