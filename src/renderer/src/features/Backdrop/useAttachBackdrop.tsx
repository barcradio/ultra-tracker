import { MouseEventHandler, useEffect, useId } from "react";
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

  // Attach or remove the backdrop based on the open state
  useEffect(() => {
    if (open) {
      addBackdrop(id, onBackdropClick);
    } else {
      removeBackdrop(id);
    }

    // Remove the backdrop if the component unmounts
    return () => removeBackdrop(id);
  }, [open, id, onBackdropClick, addBackdrop, removeBackdrop]);
};
