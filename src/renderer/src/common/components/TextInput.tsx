import { classed } from "~/lib/classed";

export const TextInput = classed("input", {
  base: "border-b-2 border-gray-400 p-2  text-slate-800 outline-none focus:border-gray-900",
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
