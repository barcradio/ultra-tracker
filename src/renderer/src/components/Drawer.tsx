import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "~/assets/icons/xmark.svg?react";
import { useAttachBackdrop } from "~/features/Backdrop";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  open: boolean;
  handleClose: () => void;
  position?: "left" | "right" | "top" | "bottom";
  className?: string;
  showCloseIcon?: boolean;
}

const DrawerElement = classed.div(
  "overflow-auto fixed z-40 transition-transform duration-200 ease-in-out bg-component text-on-component",
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

export function Drawer(props: Props) {
  const { open, handleClose, children, position } = props;
  const portalRef = usePortalRoot();
  const bodyRef = useRef(document.querySelector("body"));

  useAttachBackdrop(open, handleClose);

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
      if (event.key === "Escape") handleClose();
    };

    if (open) {
      window.addEventListener("keyup", escapeListener);
    } else {
      window.removeEventListener("keyup", escapeListener);
    }

    return () => window.removeEventListener("keyup", escapeListener);
  }, [open, handleClose]);

  return createPortal(
    <div aria-hidden={!open}>
      <DrawerElement
        position={position ?? "left"}
        role="dialog"
        open={open}
        className={props.className}
      >
        {props.showCloseIcon !== false && (
          <div className="fixed top-0 right-0 p-2">
            <Button onClick={handleClose} variant="ghost" color="neutral">
              <CloseIcon width={22} height={22} />
            </Button>
          </div>
        )}
        {open && children}
      </DrawerElement>
    </div>,
    portalRef.current
  );
}
