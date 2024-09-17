import { useCurrentTime } from "~/hooks/useCurrentTime";
import { formatDate } from "~/lib/datetimes";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = formatDate(currentTime);

  return <h1 className="p-2 text-7xl font-bold text-primary in-w-80 font-display">{formatted}</h1>;
}
