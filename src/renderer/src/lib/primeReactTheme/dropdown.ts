import { DropdownPassThroughOptions } from "primereact/dropdown";
import { classNames } from "primereact/utils";

export const DropdownPT: DropdownPassThroughOptions = {
  root: (params) => ({
    className: classNames(
      "inline-flex relative border-2 cursor-pointer select-none group/dropdown border-component",
      "rounded-md transition-colors duration-200 ease-in-out bg-surface-secondary",
      "w-full focus:outline-none grow",
      { "opacity-60 cursor-default pointer-events-none select-none": params?.props.disabled }
    )
  }),
  input: (params) => ({
    className: classNames(
      "block flex overflow-hidden relative flex-auto uppercase whitespace-nowrap cursor-pointer overflow-ellipsis",
      "bg-transparent",
      "py-2 px-3 bg-transparent rounded transition duration-200 appearance-none font-display",
      "font-medium focus:shadow-none focus:outline-none",
      { "pr-7": params?.props.showClear }
    )
  }),
  trigger: (params) => ({
    className: classNames(
      "flex justify-center items-center transition duration-200 ease-in-out shrink-0",
      "group-hover/dropdown:text-on-surface-hover",
      { "transform rotate-180 text-on-surface-hover": params?.state.overlayVisible },
      { "text-on-surface": !params?.state.overlayVisible },
      "w-12 bg-transparent rounded-tr-lg rounded-br-lg"
    )
  }),
  wrapper: (params) => {
    return {
      style: { scrollbarWidth: "none" },
      className: classNames(
        "overflow-auto max-h-[200px] bg-surface-secondary",
        "shadow-lg text-on-surface",
        { "rounded-br-lg rounded-bl-lg": params?.props.filter },
        { "rounded-lg": !params?.props.filter }
      )
    };
  },
  list: { className: "py-3 m-0 list-none" },
  item: (params) => ({
    className: classNames(
      "overflow-hidden relative whitespace-nowrap cursor-pointer font-display",
      "p-3 m-0 rounded-none transition duration-200",
      {
        "font-semibold text-on-component bg-surface hover:text-on-surface-hover":
          params?.context.selected
      },
      {
        "font-medium bg-surface-secondary text-on-surface hover:bg-surface hover:text-on-surface-hover":
          !params?.context.selected
      }
    )
  }),
  itemLabel: { className: "font-medium uppercase" },
  itemGroupLabel: { className: "font-semibold uppercase" },
  itemGroup: {
    className: classNames(
      "p-3 m-0 border-b-2 cursor-auto text-on-component bg-component-strong border-component font-display"
    )
  },
  header: {
    className: classNames(
      "p-3 mt-0 rounded-tl-lg rounded-tr-lg border-b text-on-surface bg-surface-secondary border-component font-display"
    )
  },
  filterContainer: { className: "relative bg-surface" },
  emptyMessage: { className: "p-3 m-0 font-medium text-on-surface font-display" },
  filterInput: {
    className: classNames(
      "pr-7 -mr-7",
      "w-full",
      "pl-5 font-medium transition duration-200 appearance-none outline-none font-display text-on-surface bg-surface-secondary"
    )
  },
  filterIcon: { className: "absolute top-1/2 -mt-2" },
  clearIcon: { className: "absolute right-12 top-1/2 -mt-2 text-on-surface" },
  transition: {
    timeout: 300,
    classNames: {
      enter: "opacity-0 scale-y-75",
      enterActive: "opacity-100 transition duration-100 ease-in !scale-y-100",
      exit: "transition duration-150 ease-out",
      exitActive: "opacity-0"
    }
  }
};
