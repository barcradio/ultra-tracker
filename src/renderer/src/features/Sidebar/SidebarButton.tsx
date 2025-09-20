// @ts-nocheck
import { FunctionComponent, SVGProps, useRef } from "react";
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
  "static py-2 my-0.5 ml-4 text-lg font-bold uppercase transition-all duration-100 cursor-pointer font-display *:transition-all *:duration-100 text-on-surface group/link",
  {
    variants: {
      active: {
        true: "text-primary [&>svg]:fill-primary",
        false:
          "[&>svg]:fill-on-surface [&>svg]:hover:fill-on-surface-hover hover:border-on-surface-hover hover:text-on-surface-hover"
      }
    }
  }
);

// Use a separate indicator rather than border to allow a smooth transition
// of the indicator location when expanding/collapsing the sidebar
const Indicator = classed.div({
  base: "absolute right-0 w-1",
  variants: {
    active: {
      true: "opacity-100 bg-primary",
      false: "opacity-0 group-hover/link:bg-on-surface-hover group-hover/link:opacity-100"
    }
  }
});

export function SidebarButton(props: SidebarButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonRect = buttonRef.current?.getBoundingClientRect();

  return (
    <button className="w-full" type="button" onClick={props.onClick} ref={buttonRef}>
      <SidebarStack direction="row" align="center" active={props.active ?? false}>
        <Indicator
          active={props.active ?? false}
          style={{
            top: buttonRect?.top ?? 0,
            height: buttonRect?.height ?? 0
          }}
        />
        {
          // TODO: fix TS2769
          props.icon({
            className: "mr-4 ml-1",
            title: props.children,
            height: 28,
            width: 28
          })
        }
        {props.children}
      </SidebarStack>
    </button>
  );
}
