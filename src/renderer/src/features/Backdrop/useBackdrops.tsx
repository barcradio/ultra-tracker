import { MouseEventHandler, useCallback, useState } from "react";

interface Backdrop {
  id: string;
  handler?: MouseEventHandler<HTMLButtonElement>;
}

export function useBackdrops() {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);

  const addBackdrop = useCallback(
    (backdropId: string | number, handler?: MouseEventHandler<HTMLButtonElement>) => {
      setBackdrops((prev) => [...prev, { id: backdropId.toString(), handler }]);
    },
    []
  );

  const removeBackdrop = useCallback((backdropId: string | number) => {
    setBackdrops((prev) => prev.filter((backdrop) => backdrop.id !== backdropId.toString()));
  }, []);

  const handleBackdropClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const topBackdrop = backdrops[backdrops.length - 1];
      if (topBackdrop?.handler) topBackdrop.handler(event);
    },
    [backdrops]
  );

  const showBackdrop = backdrops.length > 0;

  return { addBackdrop, removeBackdrop, showBackdrop, handleBackdropClick };
}
