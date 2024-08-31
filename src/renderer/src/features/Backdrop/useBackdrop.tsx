import { useCallback, useState } from "react";

export function useBackdrop() {
  const [backdrops, setBackdrops] = useState<string[]>([]);

  const addBackdrop = useCallback(
    (backdropId: string | number) => {
      if (backdrops.includes(backdropId.toString())) return;
      setBackdrops((prev) => [...prev, backdropId.toString()]);
    },
    [backdrops]
  );

  const removeBackdrop = useCallback(
    (backdropId: string | number) => {
      if (!backdrops.includes(backdropId.toString())) return;
      setBackdrops((prev) => prev.filter((id) => id !== backdropId.toString()));
    },
    [backdrops]
  );

  const shouldShowBackdrop = backdrops.length > 0;

  return { addBackdrop, removeBackdrop, shouldShowBackdrop };
}
