import { classed } from "~/lib/classed";

export const TextInput = classed.input({
  base: "p-2 rounded-md border-2 outline-none bg-surface-secondary border-on-surface text-on-surface font-display placeholder:text-component-strong focus:border-surface",
  variants: {
    size: {
      sm: "text-xl",
      md: "text-2xl",
      lg: "text-4xl",
      xl: "text-7xl"
    }
  },
  defaultVariants: {
    size: "md"
  }
});
