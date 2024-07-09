import { ReactNode } from "react";
import { LinkProps } from "@tanstack/react-router";
import { Stack } from "~/components";

interface Props {
  to: LinkProps["to"];
  children: ReactNode;
  icon: ReactNode;
}

export function SidebarLink(props: Props) {
  return <Stack direction="row">{props.children}</Stack>;
}
