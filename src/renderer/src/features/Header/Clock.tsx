import { format } from "date-fns";
import { useCurrentTime } from "~/common/hooks/useCurrentTime";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = format(currentTime, "kk:mm:ss a");

  return <h1 className="p-6 font-display text-5xl font-semibold text-yellow-400">{formatted}</h1>;
}
