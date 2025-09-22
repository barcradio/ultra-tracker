import { RefObject, useCallback, useLayoutEffect, useState } from "react";

export function useParentHeight(ref: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);

  const setSpace = useCallback(() => {
    const rect = ref?.current?.parentElement?.getBoundingClientRect();
    const height = rect?.height ?? 0;
    setHeight(height);
  }, [ref]);

  useLayoutEffect(() => {
    if (!ref?.current) return;
    setSpace();
    window.addEventListener("resize", setSpace);
    return () => window.removeEventListener("resize", setSpace);
  }, [ref, setSpace]);

  return height;
}
