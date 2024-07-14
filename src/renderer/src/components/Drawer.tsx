import { ReactNode, useEffect, useRef } from "react";
import FocusTrap from "focus-trap-react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "~/hooks/usePortalRoot";
import { classed } from "~/lib/classed";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  position?: "left" | "right" | "top" | "bottom";
  className?: string;
}

const DrawerElement = classed.div(
  "overflow-auto fixed z-50 transition-transform duration-200 ease-in-out bg-component",
  {
    variants: {
      position: {
        left: "top-0 left-0 h-full",
        right: "top-0 right-0 h-full",
        top: "top-0 left-0 w-full",
        bottom: "right-0 bottom-0 left-0 w-full"
      },
      open: {
        true: "",
        false: ""
      }
    },
    compoundVariants: [
      {
        position: "left",
        open: false,
        className: "-translate-x-full"
      },
      {
        position: "right",
        open: false,
        className: "translate-x-full"
      },
      {
        position: "top",
        open: false,
        className: "-translate-y-full"
      },
      {
        position: "bottom",
        open: false,
        className: "translate-y-full"
      }
    ]
  }
);

const Backdrop = classed.div(
  "fixed top-0 left-0 w-full h-full transition-all duration-200 ease-in-out bg-surface-secondary",
  {
    variants: {
      open: {
        true: "opacity-50 pointer-events-auto z-index-10",
        false: "opacity-0 pointer-events-none"
      }
    }
  }
);

export function Drawer(props: Props) {
  const { open, setOpen, children, position } = props;
  const portalRef = usePortalRoot();
  const bodyRef = useRef(document.querySelector("body"));

  // Disable scrolling when the drawer is open
  useEffect(() => {
    if (open) {
      bodyRef.current!.style.overflow = "hidden";
    } else {
      bodyRef.current!.style.overflow = "";
    }
  }, [open]);

  // Close the drawer when the escape key is pressed
  useEffect(() => {
    const escapeListener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) window.addEventListener("keyup", escapeListener);
    return () => window.removeEventListener("keyup", escapeListener);
  }, [open, setOpen]);

  return createPortal(
    <FocusTrap active={open}>
      <div>
        <DrawerElement
          position={position ?? "left"}
          role="dialog"
          open={open}
          className={props.className}
        >
          {children}
          <Button onClick={() => props.setOpen(false)}>Close</Button>
        </DrawerElement>
        <Backdrop open={open} />
      </div>
    </FocusTrap>,
    portalRef.current
  );
}
