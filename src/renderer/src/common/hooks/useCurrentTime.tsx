import { useEffect, useState } from "react";
import { addSeconds } from "date-fns";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((current) => addSeconds(current, 1));
    }, 1000);

    return () => clearInterval(interval);
  });

  return [currentTime] as const;
}
