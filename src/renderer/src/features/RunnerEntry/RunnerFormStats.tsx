import { KeyboardEvent, useRef, useState } from "react";
import { Button, Stack, TextInput } from "~/components";
import { useCreateTiming } from "~/hooks/useCreateTiming";
import { Stats } from "./Stats";
import { RecordType } from "../../../../shared/models";

export function RunnerFormStats() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [bibNumber, setBibNumber] = useState("");
  const createTiming = useCreateTiming();

  const createRecord = (type: RecordType) => {
    if (bibNumber.length === 0) return;

    createTiming.mutate({
      bib: parseInt(bibNumber),
      datetime: new Date(),
      type,
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

  const handleChange = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key.match(/\+|-/)) {
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
        break;
      }

      case "Minus":
      case "NumpadSubtract": {
        createRecord(RecordType.Out);
        break;
      }

      case "Slash":
      case "Backslash":
      case "NumpadDivide": {
        createRecord(RecordType.InOut);
        break;
      }
    }
  };

  return (
    <Stack direction="col" align="stretch" className="mr-4 w-1/5">
      <TextInput
        ref={inputRef}
        onKeyDown={handleChange}
        onKeyUp={handleKeyboardShortcuts}
        className="h-32 text-center border-component"
        placeholder="BIB#"
        size="xl"
        type="number"
      />
      <Stack direction="row" align="stretch" className="mt-2 mb-4 w-full h-12" justify="stretch">
        <Button
          name="button_In"
          variant="solid"
          color="success"
          className="mr-1 w-1/2"
          onClick={() => createRecord(RecordType.In)}
        >
          In
        </Button>
        <Button
          name="button_Out"
          variant="solid"
          color="danger"
          className="ml-1 w-1/2"
          onClick={() => createRecord(RecordType.Out)}
        >
          Out
        </Button>
      </Stack>
      <div className="w-full grow bg-component">
        <Stats />
      </div>
    </Stack>
  );
}
