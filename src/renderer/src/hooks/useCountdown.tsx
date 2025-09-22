import { useEffect, useRef, useState } from "react";

interface Options {
  ascending?: boolean;
  enable?: boolean;
}
export function useCountdown(count: number, options: Options = {}) {
  const [countdown, setCountdown] = useState(count);

  // @ts-ignore
  const intervalRef = useRef<NodeJS.Timeout>(); // TODO: fix TS2554

  const resetCountdown = () => {
    setCountdown(count);
    clearInterval(intervalRef.current);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (options.enable === false) {
        clearInterval(intervalRef.current);
        return;
      }

      setCountdown((prev) => {
        if (options.ascending ? prev < count : prev > 0) {
          return options.ascending ? prev + 1 : prev - 1;
        } else {
          clearInterval(intervalRef.current);
          return prev;
        }
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [count, options.enable, options.ascending]);

  return { countdown, resetCountdown };
}
