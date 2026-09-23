import { MouseEventHandler, useCallback, useEffect, useId, useRef } from "react";
import { useBackdropContext } from "./useBackdropContext";

// This is a custom hook that attaches a backdrop to a generic open state i.e. open modal/drawer state.
// Additionally, you can pass a callback function to handle the backdrop click event.

type UseAttachBackdrop = (
  open: boolean,
  onBackdropClick?: MouseEventHandler<HTMLButtonElement>
) => void;

export const useAttachBackdrop: UseAttachBackdrop = (open, onBackdropClick) => {
  const id = useId();
  const { addBackdrop, removeBackdrop } = useBackdropContext();

  // Callers pass an inline handler, so keeping it in the effect deps detaches and reattaches on
  // every render of every mounted drawer — enough to exceed React's nested update limit.
  const handlerRef = useRef(onBackdropClick);
  useEffect(() => {
    handlerRef.current = onBackdropClick;
  });

  const stableHandler: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => handlerRef.current?.(event),
    []
  );

  const hasHandler = Boolean(onBackdropClick);

  // Attach or remove the backdrop based on the open state
  useEffect(() => {
    if (open) {
      addBackdrop(id, hasHandler ? stableHandler : undefined);
    } else {
      removeBackdrop(id);
    }

    // Remove the backdrop if the component unmounts
    return () => removeBackdrop(id);
  }, [open, id, hasHandler, stableHandler, addBackdrop, removeBackdrop]);
};
