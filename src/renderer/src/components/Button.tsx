import { classed } from "~/lib/classed";

export const Button = classed.button({
  base: "cursor-pointer rounded-md text-center font-display font-bold uppercase transition-all duration-150 ease-in-out",
  variants: {
    color: {
      primary: "bg-yellow-400 text-slate-800 hover:bg-yellow-400",
      error: "bg-red-600 text-slate-100 hover:bg-red-700",
      success: "bg-green-600 text-slate-100 hover:bg-green-700"
    },
    size: {
      sm: "px-1 py-0.5 text-base",
      md: "px-2 py-1 text-lg",
      lg: "px-3 py-2 text-xl"
    }
  },
  defaultVariants: {
    color: "primary",
    size: "md"
  },
  defaultProps: {
    type: "button"
  }
});
