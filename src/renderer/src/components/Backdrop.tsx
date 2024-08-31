import { classed } from "~/lib/classed";

export const Backdrop = classed.button(
  "fixed top-0 left-0 z-30 w-full h-full transition-all duration-200 ease-in-out bg-surface-secondary",
  {
    variants: {
      open: {
        true: "opacity-50 pointer-events-auto",
        false: "opacity-0 pointer-events-none"
      }
    }
  }
);
