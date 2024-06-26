import { classed } from "~/lib/classed";

export const Button = classed.button({
  base: "font-bold text-center uppercase rounded-md transition-all duration-150 ease-in-out cursor-pointer font-display",
  variants: {
    color: {
      primary: "bg-yellow-400 hover:bg-yellow-500 text-slate-800",
      error: "bg-red-600 hover:bg-red-700 text-slate-100",
      success: "bg-green-600 hover:bg-green-700 text-slate-100"
    },
    size: {
      sm: "py-0.5 px-1 text-base",
      md: "py-1 px-2 text-lg",
      lg: "py-2 px-3 text-xl"
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
