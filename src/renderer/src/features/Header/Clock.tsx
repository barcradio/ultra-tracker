import { useCurrentTime } from "~/hooks/useCurrentTime";
import { formatDate } from "~/lib/datetimes";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = formatDate(currentTime);

  return (
    <h1 className="px-2 font-bold leading-tight whitespace-nowrap text-primary font-display text-[clamp(2rem,min(5vw,8vh),4.5rem)]">
      {formatted}
    </h1>
  );
}
