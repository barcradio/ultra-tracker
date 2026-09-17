import { RefObject, useCallback, useLayoutEffect, useState } from "react";

export function useParentHeight(ref: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);

  const setSpace = useCallback(() => {
    const height = ref?.current?.parentElement?.clientHeight ?? 0;
    setHeight(height);
  }, [ref]);

  useLayoutEffect(() => {
    const parent = ref?.current?.parentElement;
    if (!parent) return;
    setSpace();
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
