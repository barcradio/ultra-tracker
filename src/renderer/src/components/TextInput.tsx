import { classed } from "~/lib/classed";

export const TextInput = classed.input({
  base: "p-2 border-b-2 border-gray-400 outline-none text-on-primary focus:border-surface",
  variants: {
    outline: {
      true: "rounded-md border-2"
    },
    size: {
      sm: "text-xl",
      md: "text-2xl",
      lg: "text-4xl"
    }
  },
  defaultVariants: {
    size: "md"
  }
});
