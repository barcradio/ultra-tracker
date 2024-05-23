import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function KeyHint({ children }: Props): JSX.Element {
  return (
    <code className="font-semibold px-1 py-1.5 rounded-sm font-mono bg-neutral-800 text-sm">
      {children}
    </code>
  );
}
