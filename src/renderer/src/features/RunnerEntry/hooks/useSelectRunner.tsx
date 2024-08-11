import { useState } from "react";
import { RunnerWithSequence } from "~/hooks/useRunnerData";

export function useSelectRunner(runner: RunnerWithSequence, runners: RunnerWithSequence[]) {
  const [currentRunner, setCurrentRunner] = useState(runner);

  const handleChangeCurrent = (direction: "previous" | "next") => {
    const sequence = currentRunner.sequence + (direction === "next" ? 1 : -1);
    const nextRunner = runners.find((runner) => runner.sequence === sequence);
    if (!nextRunner) {
      return;
    }
    setCurrentRunner(nextRunner);
  };

  return {
    state: currentRunner,
    setState: setCurrentRunner,
    next: () => handleChangeCurrent("next"),
    previous: () => handleChangeCurrent("previous")
  };
}
