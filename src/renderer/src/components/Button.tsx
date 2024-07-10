import { classed } from "~/lib/classed";

export const Button = classed.button({
  base: "font-bold text-center uppercase rounded-md transition-all duration-150 ease-in-out cursor-pointer font-display",
  variants: {
    color: {
      primary: "bg-primary text-on-primary hover:bg-primary-hover",
      danger: "bg-danger text-on-danger hover:bg-danger-hover",
      success: "bg-success text-on-success hover:bg-success-hover"
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
