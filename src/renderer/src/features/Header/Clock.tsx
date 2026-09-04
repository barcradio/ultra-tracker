import { useCurrentTime } from "~/hooks/useCurrentTime";
import { formatDate } from "~/lib/datetimes";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = formatDate(currentTime);

  return (
    <h1 className="p-2 font-bold whitespace-nowrap text-primary in-w-80 font-display text-[clamp(2.25rem,5vw,4.5rem)]">
      {formatted}
    </h1>
  );
}
