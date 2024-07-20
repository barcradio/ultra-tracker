import { Stack, Button, TextInput } from "~/components";
import { useTimingRecord } from "~/hooks/useTimingRecord";
import { TimingRecord, RecordType } from '../../../../shared/models';
import { useToasts } from "../Toasts/useToasts";


export function BibForm() {
  const { createToast } = useToasts();
  let lastGoodValue: number = -1;

  const onClick_CreateRecord = (type: RecordType) => {
    let record: TimingRecord | null = BuildTimingRecord(type)
    if (record == null) {
       createToast({ message: "Cannot build timing record: bad input", type: "error" });
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

  return (
    <Stack align="stretch">
      <TextInput name="textInput_Bib" className="m-1.5 w-32" type="number" inputMode="numeric" placeholder="Bib #" size="lg" outline 
        onKeyDownCapture={handleOnKeyDownCapture}
        onKeyUp={handleOnKeyUp} />
      <Stack direction="col">
        <Button name="button_In" className="m-1.5 mb-0 min-w-24" color="success" size="lg" 
          onClick={(event) => onClick_CreateRecord(RecordType.In)}>
          In
        </Button>
        <Button name="button_In" className="m-1.5 min-w-24" color="error" size="lg" 
          onClick={(event) => onClick_CreateRecord(RecordType.Out)}>
          Out
        </Button>
      </Stack>
    </Stack>
  );
}
