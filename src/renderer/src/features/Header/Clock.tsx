import { format } from "date-fns";
import { useCurrentTime } from "~/hooks/useCurrentTime";

export function Clock() {
  const [currentTime] = useCurrentTime();
  const formatted = format(currentTime, "kk:mm:ss dd LLL");

  return (
    <h1 className="p-6 text-6xl font-bold text-yellow-400 min-w-80 font-display">
      {formatted}
    </h1>
  );
}
