import { useStoreValue } from "~/hooks/ipc/useStoreValue";
import { formatDate } from "~/lib/datetimes";
import { EntryMode } from "$shared/enums";

interface Props {
  value: Date | null;
}
export function InTimeCell({ value }: Props) {
  const { data: entryMode } = useStoreValue("station.entryMode", {
    transform: (value) => EntryMode[value as keyof typeof EntryMode]
  });

  if (!value) return null;

  if (entryMode !== EntryMode.Fast) {
    return formatDate(value);
  } else {
    return <span className="font-medium text-on-surface">{formatDate(value)}</span>;
  }
}
