import { ChangeEvent, KeyboardEvent, useRef, useState } from "react";
import { Tooltip } from "primereact/tooltip";
import { Button, Stack, TextInput } from "~/components";
import { useCreateTiming } from "~/hooks/data/useTiming";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { useId } from "~/hooks/useId";
import { EntryMode, RecordType } from "$shared/enums";
import { useEntryMode } from "./hooks/useEntryMode";
import { Stats } from "./Stats";
import { useInvalidateRunnersOnRFID } from "../../hooks/ipc/useInvalidateRunnersOnRFID";

export function RunnerFormStats() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [bibNumber, setBibNumber] = useState("");
  const { data: entryMode } = useEntryMode();
  const createTiming = useCreateTiming();
  const portalRoot = usePortalRoot();
  const buttonInId = useId();

  useInvalidateRunnersOnRFID();

  const createRecord = (type: RecordType) => {
    if (bibNumber.length === 0) return;

    createTiming.mutate({
      id: -1,
      bibId: parseInt(bibNumber),
      in: type == RecordType.In || type == RecordType.InOut ? new Date() : null,
      out: type == RecordType.Out || type == RecordType.InOut ? new Date() : null,
      note: ""
    });

    clearInput();
  };

  const clearInput = () => {
    if (!inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current?.focus();
    setBibNumber("");
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (value.match(/\+|-/)) {
      event.preventDefault();
      return;
    }

    const cleaned = event.currentTarget.value.replace(/\D/g, "");
    setBibNumber(cleaned);
  };

  const handleKeyboardShortcuts = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.code) {
      case "Enter":
      case "NumpadEnter":
      case "Equal":
      case "NumpadAdd": {
        createRecord(RecordType.In);
        event.preventDefault();
        return true;
      }
      case "Minus":
      case "NumpadSubtract": {
        createRecord(RecordType.Out);
        event.preventDefault();
        return true;
      }
      case "Slash":
      case "Backslash":
      case "NumpadDivide": {
        createRecord(RecordType.InOut);
        event.preventDefault();
        return true;
      }
    }
    return false;
  };

  return (
    <Stack direction="col" align="stretch" className="gap-2 w-1/5">
      <TextInput
        ref={inputRef}
        onKeyDown={handleKeyboardShortcuts}
        onChange={handleChange}
        className="h-32 text-8xl text-center border-component"
        placeholder="BIB#"
        type="number"
      />
      <Stack direction="row" align="stretch" className="mb-2 w-full h-12 gap-2" justify="stretch">
        <div className="w-1/2" id={buttonInId}>
          <Button
            name="button_In"
            variant="solid"
            color="success"
            className="w-full h-full"
            onClick={() => createRecord(RecordType.In)}
            disabled={entryMode === EntryMode.Fast}
          >
            In
          </Button>
        </div>
        <Button
          name="button_Out"
          variant="solid"
          color="danger"
          className="w-1/2"
          onClick={() => createRecord(RecordType.Out)}
        >
          Out
        </Button>
      </Stack>
      <div className="w-full grow bg-component">
        <Stats />
      </div>

      {entryMode === EntryMode.Fast && (
        <Tooltip target={`#${buttonInId}`} appendTo={portalRoot?.current}>
          Station is in fast mode
        </Tooltip>
      )}
    </Stack>
  );
}
