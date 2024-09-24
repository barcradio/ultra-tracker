import { formatDate } from "~/lib/datetimes";
import { EntryMode } from "$shared/enums";
import { useEntryMode } from "./hooks/useEntryMode";

interface Props {
  value: Date | null;
}
export function InTimeCell({ value }: Props) {
  const { data: entryMode } = useEntryMode();

  if (!value) return null;

  if (entryMode !== EntryMode.Fast) {
    return formatDate(value);
  } else {
    return <span className="font-medium text-on-surface">{formatDate(value)}</span>;
  }
}
