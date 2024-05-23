import { Link as TanstackLink, LinkProps } from "@tanstack/react-router";

export function Link(props: LinkProps) {
  return (
    <TanstackLink
      className="cursor-pointer inline-block border-2 border-transparent text-center  bg-gray-700 rounded-3xl px-2.5 font-semibold text-sm leading-9 text-slate-200 hover:text-slate-100 hover:bg-slate-600 cursor-pointer hover:border-gray-700"
      {...props}
    />
  );
}
