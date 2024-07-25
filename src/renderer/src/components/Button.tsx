import { classed } from "~/lib/classed";

export const Button = classed.button({
  base: "font-bold text-center uppercase rounded-md border-2 transition-all duration-150 ease-in-out cursor-pointer font-display *:fill-current",
  variants: {
    color: {
      primary: "",
      danger: "",
      warning: "",
      success: "",
      neutral: ""
    },
    variant: {
      ghost: "border-transparent",
      outlined: "border-solid",
      solid: "border-solid"
    },
    size: {
      sm: "py-0.5 px-1 text-base",
      md: "py-1 px-2 text-lg",
      lg: "py-2 px-3 text-xl"
    }
  },
  compoundVariants: [
    // Solid Variants
    {
      color: "primary",
      variant: "solid",
      className: "text-on-primary bg-primary hover:bg-primary-hover"
    },
    {
      color: "danger",
      variant: "solid",
      className: "text-on-danger bg-danger hover:bg-danger-hover"
    },
    {
      color: "warning",
      variant: "solid",
      className: "text-on-warning bg-warning hover:bg-warning-hover"
    },
    {
      color: "success",
      variant: "solid",
      className: "text-on-success bg-success hover:bg-success-hover"
    },
    // Ghost Variants
    {
      color: "primary",
      variant: "ghost",
      className: "text-primary hover:text-primary-hover"
    },
    {
      color: "danger",
      variant: "ghost",
      className: "text-danger hover:text-danger-hover"
    },
    {
      color: "warning",
      variant: "ghost",
      className: "text-warning hover:text-warning-hover"
    },
    {
      color: "success",
      variant: "ghost",
      className: "text-success hover:text-success-hover"
    },
    {
      color: "neutral",
      variant: "ghost",
      className: "text-on-component hover:text-on-component-hover"
    },
    // Outlined Variants
    {
      color: "primary",
      variant: "outlined",
      className: "text-primary hover:text-primary-hover hover:border-primary-hover"
    },
    {
      color: "danger",
      variant: "outlined",
      className: "text-danger hover:text-danger-hover hover:border-danger-hover"
    },
    {
      color: "warning",
      variant: "outlined",
      className: "text-warning hover:text-warning-hover hover:border-warning-hover"
    },
    {
      color: "success",
      variant: "outlined",
      className: "text-success hover:text-success-hover hover:border-success-hover"
    },
    {
      color: "neutral",
      variant: "outlined",
      className: "text-on-component hover:text-on-component-hover hover:border-on-component-hover"
    }
  ],
  defaultVariants: {
    variant: "solid",
    color: "primary",
    size: "md"
  }
});
