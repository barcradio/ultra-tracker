import { PrimeReactPTOptions } from "primereact/api";
import { CalendarPT } from "./calendar";
import { DropdownPT } from "./dropdown";
import { OverlayPanelPT } from "./overlaypanel";
import { TooltipPT } from "./tooltip";

export const PrimeReactTheme: PrimeReactPTOptions = {
  calendar: CalendarPT,
  tooltip: TooltipPT,
  dropdown: DropdownPT,
  overlaypanel: OverlayPanelPT
};
