import { DropdownPassThroughOptions } from "primereact/dropdown";
import { classNames } from "primereact/utils";

const TRANSITIONS = {
  overlay: {
    timeout: 150,
    enterFromClass: "opacity-0 scale-75",
    enterActiveClass: "transition-opacity transition-transform duration-150 ease-in",
    leaveActiveClass: "transition-opacity duration-150 ease-linear",
    leaveToClass: "opacity-0"
  }
};

export const DropdownPT: DropdownPassThroughOptions = {
  root: (params) => ({
    className: classNames(
      "inline-flex relative cursor-pointer select-none",
      "rounded-md transition-colors duration-200 ease-in-out",
      "border-2 bg-surface-tertiary border-component",
      "w-full md:w-56",
      "focus:outline-none hover:border-component-hover",
      { "opacity-60 cursor-default pointer-events-none select-none": params?.props.disabled }
    )
  }),
  input: (params) => ({
    className: classNames(
      "block flex overflow-hidden relative flex-auto whitespace-nowrap cursor-pointer overflow-ellipsis",
      "bg-transparent border-0 text-on-surface",
      "dark:text-white/80",
      "p-3 text-base bg-transparent rounded transition duration-200 appearance-none font-display",
      "font-medium focus:shadow-none focus:outline-none",
      { "pr-7": params?.props.showClear }
    )
  }),
  trigger: {
    className: classNames(
      "flex justify-center items-center shrink-0",
      "w-12 bg-transparent rounded-tr-lg rounded-br-lg text-on-surface"
    )
  },
  wrapper: (params) => {
    return {
      className: classNames(
        "overflow-auto max-h-[200px]",
        "border-0 shadow-lg text-on-surface",
        "dark:bg-surfrce-tertiary",
        { "rounded-br-lg rounded-bl-lg": params?.props.filter },
        { "rounded-lg": !params?.props.filter }
      )
    };
  },
  list: { className: "py-3 m-0 list-none" },
  item: (params) => ({
    className: classNames(
      "overflow-hidden relative whitespace-nowrap cursor-pointer font-display",
      "p-3 m-0 rounded-none border-0 transition duration-200",
      {
        "font-semibold text-primary bg-surface hover:text-primary-hover": params?.context.selected
      },
      {
        "font-medium bg-surface-tertiary text-on-surface hover:bg-surface hover:text-on-surface-hover":
          !params?.context.selected
      }
    )
  }),
  itemLabel: { className: "font-medium" },
  itemGroupLabel: { className: "font-semibold" },
  itemGroup: {
    className: classNames(
      "p-3 m-0 border-b-2 cursor-auto text-on-surface bg-surface border-component font-display"
    )
  },
  header: {
    className: classNames(
      "p-3 mt-0 rounded-tl-lg rounded-tr-lg border-b text-on-surface bg-surface-tertiary border-component font-display"
    )
  },
  filterContainer: { className: "relative bg-surface" },
  emptyMessage: { className: "p-3 m-0 font-medium text-on-surface font-display" },
  filterInput: {
    className: classNames(
      "pr-7 -mr-7",
      "w-full",
      "pl-5 font-medium transition duration-200 appearance-none outline-none font-display text-on-surface bg-surface-tertiary"
    )
  },
  filterIcon: { className: "absolute top-1/2 -mt-2" },
  clearIcon: { className: "absolute right-12 top-1/2 -mt-2 text-on-surface" },
  transition: TRANSITIONS.overlay
};
