import { FunctionComponent, SVGProps } from "react";
import { classed } from "@tw-classed/react";
import { cva } from "class-variance-authority";
import { Stack } from "~/components";

export interface SidebarItemProps {
  children: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement> & { title: string | undefined }>;
}

export interface SidebarButtonProps extends SidebarItemProps {
  active?: boolean;
  onClick?: () => void;
}

const IconClassName = cva("mr-3 ml-1", {
  variants: {
    active: {
      true: "fill-primary",
      false: "fill-on-surface-low"
    }
  },
  defaultVariants: {
    active: false
  }
});
//
const SidebarStack = classed(Stack, "py-2 text-lg font-bold uppercase text-on-surface-low", {
  variants: {
    active: {
      true: "border-r-4 border-primary text-primary",
      false:
        "hover:border-r-4 *:hover:fill-on-surface hover:border-on-surface-low hover:text-on-surface"
    }
  },
  defaultVariants: {
    active: false
  }
});

export function SidebarButton(props: SidebarButtonProps) {
  return (
    <button className="w-full" type="button" onClick={props.onClick}>
      <SidebarStack direction="row" align="center" className="my-0.5 ml-4" active={props.active}>
        {props.icon({
          className: IconClassName({ active: props.active }),
          title: props.children,
          height: 28,
          width: 28
        })}
        {props.children}
      </SidebarStack>
    </button>
  );
}
