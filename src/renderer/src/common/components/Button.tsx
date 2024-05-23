import { MouseEventHandler, ReactNode } from "react";

interface Props {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}

export function Button({ onClick, children }: Props) {
  return (
    <button
      className="cursor-pointer inline-block border-2 border-transparent text-center  bg-gray-700 rounded-3xl px-2.5 font-semibold text-sm leading-9 text-slate-200 hover:text-slate-100 hover:bg-slate-600 cursor-pointer hover:border-gray-700"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
