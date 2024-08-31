import { TooltipPassThroughOptions } from "primereact/tooltip";
import { classNames } from "primereact/utils";

export const TooltipPT: TooltipPassThroughOptions = {
  root: (params) => ({
    className: classNames("absolute", {
      "py-0 px-1":
        params?.context.right ||
        params?.context.left ||
        (!params?.context.right &&
          !params?.context.left &&
          !params?.context.top &&
          !params?.context.bottom),
      "py-1 px-0": params?.context.top || params?.context.bottom
    })
  }),
  arrow: (params) => ({
    className: classNames("absolute w-0 h-0 border-transparent border-solid", {
      "-mt-1 border-l-0 border-y-[0.25rem] border-r-[0.25rem] border-r-surface-tertiary":
        params?.context.right,
      "-mt-1 border-r-0 border-y-[0.25rem] border-l-[0.25rem] border-l-surface-tertiary":
        params?.context.left,
      "-ml-1 border-b-0 border-x-[0.25rem] border-t-[0.25rem] border-t-surface-tertiary":
        params?.context.top,
      "-ml-1 border-t-0 border-x-[0.25rem] border-b-[0.25rem] border-b-surface-tertiary":
        params?.context.bottom
    })
  }),
  text: {
    className:
      "p-3 whitespace-pre-line break-words rounded-md text-on-component bg-surface-tertiary font-display fonty-medium"
  }
};
