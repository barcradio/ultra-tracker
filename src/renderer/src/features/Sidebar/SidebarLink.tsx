import { Link, LinkProps } from "@tanstack/react-router";
import { useIsActiveRoute } from "~/hooks/useIsActiveRoute";
import { SidebarButton, SidebarItemProps } from "./SidebarButton";

interface OurLinkProps extends SidebarItemProps {
  to: LinkProps["to"];
}

export function SidebarLink(props: OurLinkProps) {
  const active = useIsActiveRoute(props.to);

  return (
    <Link to={props.to}>
      <SidebarButton {...props} active={active ? active : undefined} />
    </Link>
  );
}
