import { ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useBackdropContext } from "~/features/Backdrop/useBackdropContext";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { classed } from "~/lib/classed";
import { Button } from "./Button";
import { Stack } from "./Stack";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
  title: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "auto";
}

interface PropsWithAffirm extends Props {
  affirmativeText: string;
  onAffirmative: () => void;
}

const ModalElement = classed.div("text-on-component font-display", {
  variants: {
    size: {
      sm: "w-[24rem]",
      md: "w-[32rem]",
      lg: "w-[48rem]",
      auto: "w-auto"
    }
  }
});

export function Modal(props: Props | PropsWithAffirm) {
  const portalRoot = usePortalRoot();
  const backdrops = useBackdropContext();
  const modalId = useId();

  const affirmativeButton: boolean = props["affirmativeText"] && props["onAffirmative"];

  useEffect(() => {
    if (props.open) {
      backdrops.addBackdrop(`modal-${modalId}`);
    } else {
      backdrops.removeBackdrop(`modal-${modalId}`);
    }
  }, [props.open, backdrops, modalId]);

  return createPortal(
    props.open && (
      <Stack
        className="fixed top-0 left-0 z-50 w-screen h-screen animate-in zoom-in-75 fade-in"
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
              <Button variant="ghost" color="neutral" onClick={() => props.setOpen(false)}>
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