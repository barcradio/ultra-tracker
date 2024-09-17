import { useEffect, useState } from "react";

export function useCurrentTime(intervalMs = 1000) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(() => new Date());
    }, intervalMs);

    return () => clearInterval(interval);
  });

  return [currentTime] as const;
}
