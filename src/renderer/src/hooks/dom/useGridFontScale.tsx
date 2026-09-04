import { useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";

export const GRID_FONT_SCALE_MIN = 0.8;
export const GRID_FONT_SCALE_MAX = 1.6;
export const GRID_FONT_SCALE_STEP = 0.1;
export const GRID_FONT_SCALE_DEFAULT = 1;

const STORE_KEY = "display.gridFontScale";
const QUERY_KEY = ["store", "get", "station", STORE_KEY];

function clampScale(value: number) {
  const clamped = Math.min(GRID_FONT_SCALE_MAX, Math.max(GRID_FONT_SCALE_MIN, value));
  return Math.round(clamped * 100) / 100;
}

// Persists to the app's settings store so it survives restarts, and scales the document's root
// font size so every rem-based element (grid text, buttons, inputs, portaled overlays) grows
// together, similar to browser zoom.
export function useGridFontScale() {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const { data } = useStoreValue<number>(STORE_KEY);
  const scale = data ?? GRID_FONT_SCALE_DEFAULT;

  useLayoutEffect(() => {
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [scale]);

  const setScale = (value: number) => {
    const clamped = clampScale(value);
    queryClient.setQueryData(QUERY_KEY, clamped);
    void ipcRenderer.invoke("set-store-value", { key: STORE_KEY, value: clamped });
  };

  const increase = () => setScale(scale + GRID_FONT_SCALE_STEP);
  const decrease = () => setScale(scale - GRID_FONT_SCALE_STEP);
  const reset = () => setScale(GRID_FONT_SCALE_DEFAULT);

  return { scale, increase, decrease, reset };
}
