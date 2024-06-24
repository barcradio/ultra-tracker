import { useContext } from "react";
import { ToastsContext } from "./ToastsContext";

export function useToasts() {
  return useContext(ToastsContext);
}
