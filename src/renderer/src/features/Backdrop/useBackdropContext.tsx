import { useContext } from "react";
import { BackdropContext } from "./BackdropContext";

export function useBackdropContext() {
  return useContext(BackdropContext);
}
