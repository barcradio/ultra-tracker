import { ReactNode } from "react";
import { Stack } from "./Stack";

interface Props {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

export function VerticalButtonGroup(props: Props) {
  return (
    <Stack
      direction="col"
      className={`gap-2 bg-component-strong p-4 rounded-xl ${props.className}`}
    >
      {props.label && (
        <span className="font-medium uppercase text-on-surface-strong font-display">
          {props.label}
        </span>
      )}
      {props.children}
    </Stack>
  );
}
