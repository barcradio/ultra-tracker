import { Link, LinkProps } from "@tanstack/react-router";
import { ComponentProps, deriveClassed } from "@tw-classed/react";
import { classed } from "~/lib/classed";
import { Button } from "./Button";

// We derive a new component here to correctly type the "to" prop of the Link
// Strictly typing routes is one of the most important features of tanstack router

const BaseButtonLink = classed(Link, Button);

interface ButtonLinkProps extends ComponentProps<typeof BaseButtonLink> {
  to: LinkProps["to"];
}

export const ButtonLink = deriveClassed<typeof BaseButtonLink, ButtonLinkProps>((props) => (
  <BaseButtonLink {...props} />
));
