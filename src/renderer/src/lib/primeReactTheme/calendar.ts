import { CalendarPassThroughOptions } from "primereact/calendar";
import { classNames } from "primereact/utils";

export const CalendarPT: CalendarPassThroughOptions = {
  // Root
  root: {
    className: classNames(
      "rounded-md border-2 border-transparent",
      "inline-flex relative w-full",
      "[&>button>span]:hidden",
      "[&>button]:flex [&>button]:flex-col [&>button]:justify-center",
      "[&>button]:bg-surface-secondary [&>button]:rounded-r-md",
      "[&>button]:text-on-surface [&>button]:hover:text-on-surface-hover",
      "[&>button]:transition [&>button]:duration-200",
      "[&>button]:pr-2"
    )
  },
  // Input
  input: {
    root: {
      className: `p-2 w-full font-medium rounded-l-md cursor-pointer bg-surface-secondary font-display text-on-on-component`,
      readOnly: "readonly"
    }
  },
  // General Panel
  panel: { className: classNames("shadow-md bg-surface-secondary") },
  // Header
  header: {
    className:
      "flex justify-between items-center p-2 font-semibold text-on-component bg-surface-tertiary font-display"
  },
  previousButton: {
    className: classNames(
      "flex overflow-hidden relative justify-center items-center w-8 h-8 rounded-full border-0 transition-colors duration-200 ease-in-out cursor-pointer text-on-component hover:text-on-component-hover"
    )
  },
  nextButton: {
    className: classNames(
      "flex overflow-hidden relative justify-center items-center w-8 h-8 rounded-full border-0 transition-colors duration-200 ease-in-out cursor-pointer text-on-component hover:text-on-component-hover"
    )
  },
  title: { className: "mx-auto leading-8" },
  monthTitle: {
    className: "p-2 pr-1 font-semibold transition duration-200 hover:text-primary"
  },
  yearTitle: { className: "p-2 pl-1 font-semibold transition duration-200 hover:text-primary" },
  // Calendar Table
  table: { className: "w-full border-collapse" },
  tableHeaderCell: { className: "px-2 pb-2 bg-surface-tertiary font-display" },
  tableBody: { className: "my-2 border-t-2 border-component-strong" },
  weekDay: { className: "font-semibold text-on-component" },
  day: { className: "text-on-surface font-display" },
  dayLabel: (params) => ({
    className: classNames(
      "flex justify-center items-center font-semibold rounded-full border border-transparent transition duration-200 cursor-pointer hover:text-primary",
      {
        "bg-primary text-on-primary hover:text-on-primary":
          !params?.context.otherMonth && params?.context.selected
      },
      {
        "text-on-component-strong": params?.context.otherMonth
      }
    )
  }),
  // Month Picker
  monthPicker: { className: "my-2" },
  month: (params) => ({
    className: classNames(
      "inline-flex justify-center items-center p-2 w-1/3 rounded-lg transition duration-200",
      "font-semibold cursor-pointer text-on-surface",
      "hover:text-primary",
      { "bg-primary text-on-primary hover:text-on-primary": params?.context.selected }
    )
  }),
  // Year Picker
  yearPicker: { className: "my-2" },
  year: (params) => ({
    className: classNames(
      "inline-flex justify-center items-center p-2 w-1/2 rounded-lg transition duration-200",
      "font-semibold cursor-pointer text-on-surface",
      "hover:text-primary",
      { "bg-primary text-on-primary hover:text-on-primary": params?.context.selected }
    )
  }),
  // Time Picker
  timePicker: {
    className:
      "flex justify-center items-center p-1 font-semibold border-t-2 border-solid border-component-strong text-on-component font-display"
  },
  separatorContainer: { className: "flex flex-col items-center px-2" },
  separator: { className: "text-xl" },
  hourPicker: { className: "flex flex-col items-center px-2" },
  minutePicker: { className: "flex flex-col items-center px-2" },
  secondPicker: { className: "flex flex-col items-center px-2" },
  ampmPicker: { className: "flex flex-col items-center px-2" },
  incrementButton: {
    className: classNames(
      "flex overflow-hidden relative justify-center items-center w-4 h-4 rounded-full border-0 transition-colors duration-200 ease-in-out cursor-pointer text-on-component hover:text-on-component-hover"
    )
  },
  decrementButton: {
    className: classNames(
      "flex overflow-hidden relative justify-center items-center w-4 h-4 rounded-full border-0 transition-colors duration-200 ease-in-out cursor-pointer text-on-component hover:text-on-component-hover"
    )
  },
  // Footer
  buttonbar: {
    className:
      "flex justify-between p-2 mt-2 font-semibold bg-component-strong text-on-component font-display"
  },
  todayButton: {
    className: classNames(
      "font-bold text-center uppercase rounded-md border-2 transition-all",
      "hover:bg-component-strong",
      "text-on-primary bg-primary hover:bg-primary-hover"
    )
  },
  clearButton: {
    className: classNames(
      "font-bold text-center uppercase rounded-md border-2 transition-all",
      "hover:bg-component-strong",
      "text-on-primary bg-primary hover:bg-primary-hover"
    )
  },
  // Groups
  groupContainer: { className: "flex" },
  group: {
    className: classNames(
      "flex-1",
      "pt-0 pr-0.5 pb-0 pl-0.5 border-l border-gray-300",
      "first:pl-0 first:border-l-0"
    )
  },
  // Transitions
  transition: {
    timeout: 150,
    classNames: {
      enter: "opacity-0 scale-y-90",
      enterActive: "opacity-100 transition duration-150 ease-in !scale-y-100",
      exit: "opacity-100",
      exitActive: "transition-opacity duration-150 ease-linear !opacity-0"
    }
  }
};
