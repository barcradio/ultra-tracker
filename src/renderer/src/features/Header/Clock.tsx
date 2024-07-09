import { useCurrentTime } from "~/hooks/useCurrentTime";
import { formatDate } from "~/lib/datetimes";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = formatDate(currentTime);

  return <h1 className="p-6 text-6xl font-bold text-primary in-w-80 font-display">{formatted}</h1>;
}
