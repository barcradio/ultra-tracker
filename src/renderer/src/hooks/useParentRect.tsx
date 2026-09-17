import { RefObject, useCallback, useLayoutEffect, useState } from "react";

export function useParentHeight(ref: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);

  const setSpace = useCallback(() => {
    const rect = ref?.current?.parentElement?.getBoundingClientRect();
    const height = rect?.height ?? 0;
    setHeight(height);
  }, [ref]);

  useLayoutEffect(() => {
    const parent = ref?.current?.parentElement;
    if (!parent) return;
    setSpace();
    // The first getBoundingClientRect() read can land before the browser has
    // finished settling flex/animation-driven layout (e.g. a modal's open
    // transition), returning a stale height that ResizeObserver won't correct
    // since the box doesn't change size afterward. Re-measure once more after
    // paint to catch that case.
    const raf = requestAnimationFrame(setSpace);
    window.addEventListener("resize", setSpace);
    const observer = new ResizeObserver(setSpace);
    observer.observe(parent);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSpace);
      observer.disconnect();
    };
  }, [ref, setSpace]);

  return height;
}
