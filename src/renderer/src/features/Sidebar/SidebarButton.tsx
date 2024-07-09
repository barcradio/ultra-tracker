import { FunctionComponent, SVGProps } from "react";
import { classed } from "@tw-classed/react";
import { Stack } from "~/components";

export interface SidebarItemProps {
  children: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement> & { title: string | undefined }>;
}

export interface SidebarButtonProps extends SidebarItemProps {
  active?: boolean;
  onClick?: () => void;
}
//
const SidebarStack = classed(
  Stack,
  "py-2 my-0.5 ml-4 text-lg font-bold uppercase border-r-4 border-transparent transition-all duration-100 *:transition-all *:duration-100 text-on-surface-low [&>svg]:mr-4 [&>svg]:ml-1",
  {
    variants: {
      active: {
        true: "border-r-4 border-primary text-primary [&>svg]:fill-primary",
        false:
          "hover:border-r-4 *:hover:fill-on-surface [&>svg]:fill-on-surface-low hover:border-on-surface hover:text-on-surface"
      }
    },
    defaultVariants: {
      active: false
    }
  }
);

export function SidebarButton(props: SidebarButtonProps) {
  return (
    <button className="w-full" type="button" onClick={props.onClick}>
      <SidebarStack direction="row" align="center" active={props.active}>
        {props.icon({
          title: props.children,
          height: 28,
          width: 28
        })}
        {props.children}
      </SidebarStack>
    </button>
  );
}
