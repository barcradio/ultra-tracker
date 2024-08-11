import { useState } from "react";
import { FieldError, useForm } from "react-hook-form";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Drawer, Stack, TextInput } from "~/components";
import { Runner, RunnerWithSequence } from "../../hooks/useRunnerData";
import { useDeleteTiming, useEditTiming } from "../../hooks/useTiming";
import { useToasts } from "../Toasts/useToasts";

interface Props {
  runner: RunnerWithSequence;
  runners: RunnerWithSequence[];
}

const getErrorMessage = (error: FieldError): string => {
  if (error.type === "required" && error.message?.length === 0) {
    return "This field is required";
  }
  return error.message ?? "Invalid input";
};

export function EditRunner(props: Props) {
  const { createToast } = useToasts();
  const [editingRunner, setEditingRunner] = useState<RunnerWithSequence>(props.runner);
  const [isOpen, setIsOpen] = useState(false);
  const editTiming = useEditTiming();
  const deleteTiming = useDeleteTiming();

  const form = useForm<Runner>({
    defaultValues: props.runner,
    values: editingRunner
  });

  const handleChangeCurrent = (direction: "previous" | "next") => {
    const sequence = editingRunner.sequence + (direction === "next" ? 1 : -1);
    const nextRunner = props.runners.find((runner) => runner.sequence === sequence);

    if (!nextRunner) {
      createToast({ message: `No ${direction} runner`, type: "warning" });
      return;
    }

    setEditingRunner(nextRunner);
  };

  const handleSaveRunner = form.handleSubmit(
    (data) => {
      // Pass in our new runner to the reset function to update the defaultValues.
      // We create a new object to avoid setting the defaults to our dynamic editingRunner state.
      // In which case defaultValues would be the same as values, and resetting would do nothing.
      form.reset({ ...data });
      editTiming.mutate(data);
      createToast({ message: `Runner #${data.runner} updated`, type: "success" }); // TODO: need to determine if successful
      setIsOpen(false);
    },
    (errors) => {
      Object.values(errors).forEach((error) => {
        createToast({ message: getErrorMessage(error as FieldError), type: "warning" });
      });
    }
  );

  const handleDeleteRunner = () => {
    deleteTiming.mutate(editingRunner);
    createToast({ message: "Runner deleted", type: "success" }); // TODO: need to determine if successful
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    form.reset();
  };

  return (
    <>
      <Button
        variant="ghost"
        color="primary"
        onClick={() => setIsOpen(true)}
        className="p-0 m-0 border-0"
      >
        <EditIcon width={20} height={20} />
      </Button>
      <Drawer
        open={isOpen}
        handleClose={handleClose}
        position="right"
        className="w-96 font-display"
        showCloseIcon={false}
      >
        <Stack className="gap-6 px-6 pt-8" direction="col" as="form" onSubmit={handleSaveRunner}>
          <h1 className="w-full text-4xl font-bold text-center uppercase font-display">
            Sequence {editingRunner.sequence}
          </h1>

          <Stack align="center" justify="between" className="w-full">
            <Button
              type="button"
              variant="ghost"
              color="primary"
              className="text-xl underline"
              onClick={() => handleChangeCurrent("previous")}
            >
              {"< PREV"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              color="primary"
              className="text-xl underline"
              onClick={() => handleChangeCurrent("next")}
            >
              {"NEXT >"}
            </Button>
          </Stack>

          <Stack className="gap-4 w-full" direction="col">
            <TextInput
              label="Runner Bib"
              placeholder="Runner"
              error={form.formState.errors.runner}
              {...form.register("runner", {
                required: "Runner is required"
              })}
            />
            <TextInput
              label="In Time"
              placeholder="In Time"
              error={form.formState.errors.in}
              {...form.register("in", {
                //required: "In Time is required",
                valueAsDate: true
              })}
            />
            <TextInput
              label="Out Time"
              placeholder="Out Time"
              error={form.formState.errors.out}
              {...form.register("out", {
                //required: "Out Time is required",
                valueAsDate: true
              })}
            />
            <TextInput
              label="Note"
              placeholder="Note"
              error={form.formState.errors.note}
              {...form.register("note")}
            />
          </Stack>

          <Stack className="gap-2 w-full" justify="end" align="center" direction="row">
            <Button
              variant="ghost"
              color="danger"
              onClick={() => handleDeleteRunner()}
              size="lg"
              type="button"
            >
              DELETE
            </Button>
            <Button variant="ghost" color="neutral" onClick={handleClose} size="lg" type="button">
              Cancel
            </Button>
            <Button variant="solid" color="primary" size="lg" type="submit">
              Apply
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
