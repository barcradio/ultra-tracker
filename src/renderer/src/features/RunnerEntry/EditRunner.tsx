import { useState } from "react";
import { FieldError } from "react-hook-form";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Drawer, Modal, Select, Stack, TextInput } from "~/components";
import { DatePicker } from "~/components/DatePicker";
import { useAthlete } from "~/hooks/data/useAthlete";
import { RunnerEx } from "~/hooks/data/useRunnerData";
import { useDeleteTiming, useEditTiming } from "~/hooks/data/useTiming";
import { DNFType } from "$shared/enums";
import { useSelectRunnerForm } from "./hooks/useSelectRunnerForm";
import { useToasts } from "../Toasts/useToasts";

interface Props {
  runner: RunnerEx;
  runners: RunnerEx[];
}

const getErrorMessage = (error: FieldError): string => {
  if (error.type === "required" && error.message?.length === 0) {
    return "This field is required";
  }
  return error.message ?? "Invalid input";
};

export function EditRunner(props: Props) {
  const { createToast } = useToasts();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const editTiming = useEditTiming();
  const deleteTiming = useDeleteTiming();

  const { form, ...selectedRunner } = useSelectRunnerForm(props.runner, props.runners);

  const handleSaveRunner = form.handleSubmit(
    (data) => {
      // Pass in our new runner to the reset function to update the defaultValues.
      // We create a new object to avoid setting the defaults to our dynamic editingRunner state.
      // In which case defaultValues would be the same as values, and resetting would do nothing.
      form.reset({ ...data });
      setIsOpen(false);
      editTiming.mutate(data);
    },
    (errors) => {
      Object.values(errors).forEach((error) => {
        createToast({ message: getErrorMessage(error as FieldError), type: "warning" });
      });
    }
  );

  const handleDeleteRunner = () => {
    deleteTiming.mutate(selectedRunner.state);
    setIsConfirmOpen(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    form.reset(props.runner); // Reset the form to the original runner
    setIsOpen(false);
  };

  const handleOpenDelete = () => {
    handleClose();
    setIsConfirmOpen(true);
  };

  const { data: athlete } = useAthlete(form.watch("runner"), isOpen);

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
        className="w-104 font-display"
        showCloseIcon={false}
      >
        <Stack
          className="gap-6 py-8 px-6 h-full"
          direction="col"
          justify="between"
          align="center"
          as="form"
          onSubmit={handleSaveRunner}
        >
          <span className="w-full">
            <h1 className="w-full text-4xl font-bold text-center uppercase font-display">
              Sequence {selectedRunner.state.sequence}
            </h1>

            <Stack align="center" justify="between" className="mb-6 w-full">
              <Button
                type="button"
                variant="ghost"
                color="primary"
                className="text-xl underline"
                onClick={() => selectedRunner.previous()}
              >
                {"< PREV"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                color="primary"
                className="text-xl underline"
                onClick={() => selectedRunner.next()}
              >
                {"NEXT >"}
              </Button>
            </Stack>

            <Stack className="gap-4 w-full" direction="col">
              <Stack className="gap-4 w-full" direction="row" align="center" justify="stretch">
                <TextInput
                  className="w-20"
                  type="number"
                  step="0.1"
                  label="Bib"
                  placeholder="Runner"
                  error={form.formState.errors.runner}
                  {...form.register("runner", {
                    required: "Runner is required"
                  })}
                />
                <TextInput
                  width="w-full"
                  className="grow"
                  label="Name"
                  value={athlete ? `${athlete.firstName} ${athlete.lastName}` : "Name"}
                  disabled
                />
              </Stack>
              <DatePicker
                name="in"
                label="In Time"
                control={form.control}
                rules={{
                  validate: (value, { out: outTime }) => {
                    if (value && outTime && value > outTime)
                      return "Runners cannot exit station before entering";
                    return true;
                  }
                }}
                showTime
                showSeconds
              />
              <Stack direction="row" align="end" justify="stretch" className="gap-6 w-full">
                <DatePicker
                  name="out"
                  label="Out Time"
                  control={form.control}
                  rules={{
                    validate: (value, { in: inTime }) => {
                      if (value && inTime && value < inTime)
                        return "Runners cannot exit station before entering";
                      return true;
                    }
                  }}
                  showTime
                  showSeconds
                />
                <Select
                  onChange={(value) => {
                    form.setValue("dnfType", value ? (value as DNFType) : DNFType.None);
                  }}
                  className="w-72 grow-0"
                  label="DNF"
                  value={form.watch("dnfType")}
                  options={["medical", "withdrew", "time", "none"]}
                  placeholder="DNF"
                />
              </Stack>
              <TextInput
                className="w-full"
                label="Note"
                placeholder="Note"
                error={form.formState.errors.note}
                {...form.register("note", {
                  validate: (value) => {
                    if (value.includes(",")) return "Commas are not allowed in the notes field";
                    return true;
                  }
                })}
              />
            </Stack>

            <Stack className="gap-8 mt-4 w-full" justify="center" align="center" direction="row">
              <Button
                variant="ghost"
                color="neutral"
                onClick={() => handleClose()}
                size="lg"
                type="button"
              >
                Cancel
              </Button>
              <Button variant="solid" color="primary" size="lg" type="submit">
                Apply
              </Button>
            </Stack>
          </span>

          <Button
            variant="solid"
            color="danger"
            onClick={() => handleOpenDelete()}
            size="lg"
            type="button"
          >
            DELETE
          </Button>
        </Stack>
      </Drawer>
      <Modal
        open={isConfirmOpen}
        setOpen={setIsConfirmOpen}
        title="Confirmation"
        showCloseButton
        affirmativeText="Confirm"
        onAffirmative={handleDeleteRunner}
      >
        <div className="text-center">
          Are you sure you want to delete the timing record for Runner #
          {selectedRunner.state.runner}?
          <span className="font-medium text-danger"> This action cannot be undone.</span>
        </div>
      </Modal>
    </>
  );
}
