import { useState } from "react";
import { useForm } from "react-hook-form";
import { useToasts } from "~/features/Toasts/useToasts";
import { RunnerWithSequence } from "~/hooks/useRunnerData";

export function useSelectRunnerForm(runner: RunnerWithSequence, runners: RunnerWithSequence[]) {
  const { createToast } = useToasts();
  const [currentRunner, setCurrentRunner] = useState(runner);

  const form = useForm<RunnerWithSequence>({
    defaultValues: runner,
    values: currentRunner
  });

  const handleChangeCurrent = (direction: "previous" | "next") => {
    const sequence = currentRunner.sequence + (direction === "next" ? 1 : -1);
    const nextRunner = runners.find((runner) => runner.sequence === sequence);

    if (!nextRunner) {
      const lastOrFirst = direction === "next" ? "last" : "first";
      const message = `You have reached the ${lastOrFirst} runner`;
      createToast({ message: message, type: "warning" });
      return;
    }

    setCurrentRunner(nextRunner);
    form.reset({ ...nextRunner });
  };

  return {
    form: form,
    state: currentRunner,
    setState: setCurrentRunner,
    next: () => handleChangeCurrent("next"),
    previous: () => handleChangeCurrent("previous")
  };
}