import { ReactNode, useLayoutEffect, useRef, useState } from "react";

export function useTruncated<T extends HTMLElement>(content: ReactNode) {
  const ref = useRef<T | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const findTruncated = () => setIsTruncated(Boolean(el) && el.scrollWidth > el.clientWidth);

    findTruncated();
    window.addEventListener("resize", () => findTruncated());
    return () => window.removeEventListener("resize", findTruncated);
  }, [content]);

  return [ref, isTruncated] as const;
}
