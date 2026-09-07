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
  const { data: eventDatabases, isSuccess } = useEventDatabases();
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

    if (isSuccess && !didAutoOpen.current) {
      didAutoOpen.current = true;
      // Always open when there are no events yet, since the Get Started wizard is required.
      if (openOnStartup || eventDatabases?.length === 0) setOpen(true);
    }
  }, [isSuccess, setOpen, openOnStartup, eventDatabases]);

  useEffect(() => {
    if (open) {
      setShowGetStarted(eventDatabases?.length === 0);
    }
  }, [open, eventDatabases]);

  if (!eventDatabases) return null;

  return showGetStarted ? (
    <GetStartedWizard open={open} setOpen={setOpen} />
  ) : (
    <LoadEventDialog open={open} setOpen={setOpen} onStartNew={() => setShowGetStarted(true)} />
  );
}
