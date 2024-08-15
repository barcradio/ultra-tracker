import { useState } from "react";
import { FieldError, useForm } from "react-hook-form";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Drawer, Stack, TextInput } from "~/components";
import { RunnerDB } from "$shared/models";
import { Runner } from "../../hooks/useRunnerData";
import { useDeleteTiming, useEditTiming } from "../../hooks/useTiming";
import { useToasts } from "../Toasts/useToasts";

interface Props {
  runner: Runner;
  runners: Runner[];
}

const getErrorMessage = (error: FieldError): string => {
  if (error.type === "required" && error.message?.length === 0) {
    return "This field is required";
  }
  return error.message ?? "Invalid input";
};

export function EditRunner(props: Props) {
  const { createToast } = useToasts();
  const [editingRunner, setEditingRunner] = useState<Runner>(props.runner);
  const [isOpen, setIsOpen] = useState(false);
  const editTiming = useEditTiming();
  const deleteTiming = useDeleteTiming();

  const form = useForm<Runner>({
    values: editingRunner
  });

  const handleChangeRunner = (direction: "previous" | "next") => {
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
      updateRunner(data);

      console.log(data);
      form.clearErrors();
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
    deleteRunner(editingRunner);
    form.clearErrors();
    createToast({ message: "Runner deleted", type: "success" }); // TODO: need to determine if successful
    setIsOpen(false);
  };

  const updateRunner = (data: Runner) => {
    editTiming.mutate({
      index: data.id,
      bibId: data.runner,
      stationId: window.data.station.id,
      timeIn: data.in?.toString() == "Invalid Date" ? null : data.in,
      timeOut: data.out?.toString() == "Invalid Date" ? null : data.out,
      timeModified: new Date(),
      note: data.notes,
      sent: false // if updating record, sent should always reset flag to false
    } as RunnerDB);
  };

  const deleteRunner = (data: Runner) => {
    deleteTiming.mutate({
      index: data.id,
      bibId: data.runner,
      stationId: window.data.station.id,
      timeIn: data.in?.toString() == "Invalid Date" ? null : data.in,
      timeOut: data.out?.toString() == "Invalid Date" ? null : data.out,
      timeModified: new Date(),
      note: data.notes,
      sent: false
    } as RunnerDB);
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
        handleClose={() => setIsOpen(false)}
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
              onClick={() => handleChangeRunner("previous")}
            >
              {"< PREV"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              color="primary"
              className="text-xl underline"
              onClick={() => handleChangeRunner("next")}
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
              label="Notes"
              placeholder="Notes"
              error={form.formState.errors.notes}
              {...form.register("notes")}
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
            <Button
              variant="ghost"
              color="neutral"
              onClick={() => setIsOpen(false)}
              size="lg"
              type="button"
            >
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