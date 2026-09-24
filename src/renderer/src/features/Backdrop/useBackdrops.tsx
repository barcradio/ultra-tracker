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
    const id = backdropId.toString();
    setBackdrops((prev) =>
      prev.some((backdrop) => backdrop.id === id)
        ? prev.filter((backdrop) => backdrop.id !== id)
        : prev
    );
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
