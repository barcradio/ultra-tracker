import { useEffect, useRef, useState } from "react";
import { useOpenEventManagerOnStartup } from "~/hooks/useOpenEventManagerOnStartup";
import { GetStartedWizard } from "./GetStartedWizard";
import { useEventDatabases } from "./hooks/useEventDatabases";
import { LoadEventDialog } from "./LoadEventDialog";

export interface EventManagerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function EventManagerDialog({ open, setOpen }: EventManagerDialogProps) {
  const { data: eventDatabases, isSuccess } = useEventDatabases(open);
  const { enabled: openOnStartup } = useOpenEventManagerOnStartup();
  const didAutoOpen = useRef(false);
  const [showGetStarted, setShowGetStarted] = useState(false);

  useEffect(() => {
    const skipAutoOpen = sessionStorage.getItem("skip-event-manager-auto-open") === "true";
    if (skipAutoOpen) {
      sessionStorage.removeItem("skip-event-manager-auto-open");
      didAutoOpen.current = true;
      return;
    }

    if (openOnStartup && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setOpen(true);
    }
  }, [setOpen, openOnStartup]);

  useEffect(() => {
    if (open && isSuccess) {
      setShowGetStarted(eventDatabases?.length === 0);
    }
  }, [open, isSuccess, eventDatabases]);

  return showGetStarted ? (
    <GetStartedWizard open={open} setOpen={setOpen} />
  ) : (
    <LoadEventDialog open={open} setOpen={setOpen} onStartNew={() => setShowGetStarted(true)} />
  );
}
