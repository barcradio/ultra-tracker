import { ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAttachBackdrop } from "~/features/Backdrop";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { Button } from "./Button";
import { Stack } from "./Stack";

export interface ModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
  title: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "auto";
}

export interface ModalAffirmProps extends ModalProps {
  affirmativeText: string;
  onAffirmative: () => void;
}

const ModalElement = classed.div(
  "cursor-default pointer-events-auto text-on-component font-display",
  {
    variants: {
      size: {
        sm: "w-[24rem]",
        md: "w-[32rem]",
        lg: "w-[48rem]",
        auto: "w-auto"
      }
    }
  }
);

export function Modal(props: ModalProps | ModalAffirmProps) {
  const { setOpen, open } = props;
  const portalRoot = usePortalRoot();
  const affirmativeButton: boolean = props["affirmativeText"] && props["onAffirmative"];

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  useAttachBackdrop(open, handleClose);

  return createPortal(
    props.open && (
      <Stack
        className="fixed top-0 left-0 z-50 w-screen h-screen cursor-pointer pointer-events-none animate-in zoom-in-75 fade-in"
        justify="center"
        align="center"
      >
        <ModalElement size={props.size ?? "md"}>
          <div className="p-3 text-xl font-bold text-center rounded-t-lg bg-component-strong">
            {props.title}
          </div>
          <div className="py-4 px-4 bg-component">{props.children}</div>
          {(affirmativeButton || props.showCloseButton) && (
            <Stack justify="end" className="gap-2 p-3 rounded-b-lg bg-component">
              <Button variant="ghost" color="neutral" onClick={handleClose}>
                Close
              </Button>
              {affirmativeButton && (
                <Button variant="solid" color="primary" onClick={props["onAffirmative"]}>
                  {props["affirmativeText"]}
                </Button>
              )}
            </Stack>
          )}
        </ModalElement>
      </Stack>
    ),
    portalRoot?.current
  );
}
