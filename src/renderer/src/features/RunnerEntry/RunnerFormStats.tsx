import { useState } from "react";
import { Button, Stack, TextInput } from "~/components";
import { Stats } from "./Stats";
import { RecordType, TimingRecord } from '../../../../shared/models';
import { useTimingRecord } from "~/hooks/useTimingRecord";
import { useToasts } from "../Toasts/useToasts";


export function RunnerFormStats() {
  const [bibNumber, setBibNumber] = useState(0);
  const { createToast } = useToasts();

  let lastGoodValue: number = -1;

  const onClick_CreateRecord = (type: RecordType) => {
    let record: TimingRecord | null = BuildTimingRecord(type)
    if (record == null) {
       createToast({ message: "Cannot build timing record: bad input", type: "danger" });
    }
    else {
      useTimingRecord(record);
    }

    ClearInput();
  };

  const handleOnKeyUp = (event) => {
    console.log('Key pressed: ' + event.code);
    switch (event.code) {
      case 'Enter':
      case 'NumpadEnter':
      case 'Equal':
      case 'NumpadAdd': {
        onClick_CreateRecord(RecordType.In);
        break;
      };

      case 'Minus':
      case 'NumpadSubtract': {
        onClick_CreateRecord(RecordType.Out);
        break;
      };
      
      case 'Slash':
      case 'Backslash':
      case 'NumpadDivide': {
        onClick_CreateRecord(RecordType.InOut);
        break;
      };
    }
  }

  // if the numeric field sees a Plus or Minus and tries to validate its own value, it clears the entire value.
  // preserve the value as it changes to evaluate and recover later
  const handleOnKeyDownCapture = (event) => {
    let result: number = ParseInput(event.target.value);

    if((result != undefined) &&
       (result != null) &&
       (!Number.isNaN(result)) &&
       (result > 0) ) {
      lastGoodValue = result;
    }
  }


  function BuildTimingRecord( type: RecordType) : TimingRecord | null {
    let bibInput: string | undefined = document.querySelector<HTMLInputElement>('input[name="textInput_Bib"]')?.value;
    let bib: number;

    if(bibInput == undefined) {
      console.log(`Cannot resolve input value.`);
      return null;
    }

    if(bibInput == '' || lastGoodValue > 0) {
      bib = lastGoodValue;
    }
    else {
      bib = ParseInput(bibInput);
    }
 
    const record: TimingRecord = {
      bib: bib,
      datetime: new Date(),
      type: type,
      note: ''
    }
  
    return record;
  }
  
  function ParseInput(userInput: string): number {
    let cleanBib = userInput.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "");
    return parseInt(cleanBib);
  }
  
  function ClearInput() {
    let element: HTMLInputElement | null = document.querySelector<HTMLInputElement>('input[name="textInput_Bib"]');
    
    if(element == null)
      return;
  
    element.value = '';
    element.focus();
  }

  const handleIn = () =>
    createToast({ message: `Runner ${bibNumber} has entered the aid station`, type: "success" });

  const handleOut = () =>
    createToast({ message: `Runner ${bibNumber} has exited the aid station`, type: "success" });

  return (
    <Stack direction="col" align="stretch" className="mr-4 w-1/5">
      <TextInput
        //onChange={(e) => setBibNumber(parseInt(e.target.value))}
        name="textInput_Bib"
        onKeyDownCapture={handleOnKeyDownCapture}
        onKeyUp={handleOnKeyUp}
        className="h-32 text-center border-component"
        placeholder="BIB#"
        size="xl"
        type="number"
      />
      <Stack direction="row" align="stretch" className="mt-2 mb-4 w-full h-12" justify="stretch">
        <Button name="button_In" variant="solid" color="success" className="mr-1 w-1/2" 
          onClick={(event) => onClick_CreateRecord(RecordType.In)}>
          In
        </Button>
        <Button name="button_Out" variant="solid" color="danger" className="ml-1 w-1/2" 
          onClick={(event) => onClick_CreateRecord(RecordType.Out)}>
          Out
        </Button>
      </Stack>
      <div className="w-full grow bg-component">
        <Stats />
      </div>
    </Stack>
  );
}
