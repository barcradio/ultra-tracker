import { OverlayPanelPassThroughOptions } from "primereact/overlaypanel";
import { classNames } from "primereact/utils";

export const OverlayPanelPT: OverlayPanelPassThroughOptions = {
  root: {
    className: classNames(
      "rounded-md border-0 shadow-lg text-on-surface bg-surface-tertiary",
      "z-40 transform origin-center",
      "absolute top-0 left-0 mt-3",
      "before:absolute before:w-0 before:-top-3 before:h-0 before:border-x-transparent before:border-solid before:ml-6 before:border-x-[0.75rem] before:border-b-[0.75rem] before:border-t-0 before:border-surface-tertiary"
    )
  },
  closeButton: {
    className: "flex overflow-hidden absolute top-0 right-0 justify-center items-center w-6 h-6"
  },
  content: { className: "flex items-center p-5" },
  transition: {
    timeout: 150,
    classNames: {
      enter: "opacity-0 scale-y-75",
      enterActive: "opacity-100 transition duration-150 ease-in !scale-y-100",
      exit: "opacity-100 scale-y-100",
      exitActive: "transition duration-150 ease-out !opacity-0 !scale-y-75"
    }
  }
};
