import { duplicateToastKey, unknownAthleteToastKey } from "~/hooks/data/useTiming";
import { DatabaseStatus } from "$shared/enums";

interface Edit {
  wasDuplicate: boolean;
  previousBib: number;
  bib: number;
  status: DatabaseStatus;
}

export function toastChangesOnEdit(edit: Edit) {
  const saved = edit.status === DatabaseStatus.Updated || edit.status === DatabaseStatus.Duplicate;
  const bibChanged = Math.floor(edit.previousBib) !== Math.floor(edit.bib);
  const dismiss: string[] = [];

  if (edit.wasDuplicate && (edit.status === DatabaseStatus.Updated || (saved && bibChanged)))
    dismiss.push(duplicateToastKey(edit.previousBib));
  if (saved && bibChanged) dismiss.push(unknownAthleteToastKey(edit.previousBib));

  return {
    dismiss,
    createDuplicate:
      edit.status === DatabaseStatus.Duplicate && bibChanged
        ? duplicateToastKey(edit.bib)
        : undefined
  };
}
