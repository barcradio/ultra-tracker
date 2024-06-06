import { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  children: ReactNode;
}

export function Button(props: Props) {
  return (
    <button
      type="button"
      className={`min-w-24  rounded-md px-2 py-1 font-display text-xl font-bold uppercase ${props.className}`}
    >
      {props.children}
    </button>
  );
}
