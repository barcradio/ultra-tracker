import { Virtualizer } from "@tanstack/react-virtual";

export const useVirtualPadding = (virtualizer: Virtualizer<HTMLDivElement, Element>) => {
  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
  return { paddingTop, paddingBottom };
};
