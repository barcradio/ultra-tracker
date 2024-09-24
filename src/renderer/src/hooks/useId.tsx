import { useId as useReactId } from "react";

export function useId(prefix?: string) {
  const id = useReactId().replace(/:/g, "");
  return prefix ? `${prefix}-${id}` : id;
}
