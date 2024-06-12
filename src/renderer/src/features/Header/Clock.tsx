import { format } from "date-fns";
import { useCurrentTime } from "~/common/hooks/useCurrentTime";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = format(currentTime, "kk:mm:ss");

  return (
    <h1 className="min-w-80 p-6 font-display text-6xl font-semibold text-yellow-400">
      {formatted}
    </h1>
  );
}
