import { useEffect } from "react";
import { useGridFontScale } from "./useGridFontScale";

// Global Ctrl/Cmd + =/-/0 shortcuts to scale data grid text, similar to browser zoom.
export function useGridFontScaleShortcuts() {
  const { increase, decrease, reset } = useGridFontScale();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.code) {
        case "Equal":
        case "NumpadAdd":
          event.preventDefault();
          increase();
          break;
        case "Minus":
        case "NumpadSubtract":
          event.preventDefault();
          decrease();
          break;
        case "Digit0":
        case "Numpad0":
          event.preventDefault();
          reset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [increase, decrease, reset]);
}
