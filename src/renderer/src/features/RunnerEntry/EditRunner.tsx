import { useState } from "react";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Drawer, Stack, TextInput } from "~/components";
import { Runner } from "./useFakeData";
import { useToasts } from "../Toasts/useToasts";

interface Props {
  runner: Runner;
  runners: Runner[];
}

export function EditRunner(props: Props) {
  const { createToast } = useToasts();
  const [editingRunner, setEditingRunner] = useState<Runner>(props.runner);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleChangeRunner = (direction: "previous" | "next") => {
    const sequence = editingRunner.sequence + (direction === "next" ? 1 : -1);
    const nextRunner = props.runners.find((runner) => runner.sequence === sequence);

    if (!nextRunner) {
      createToast({ message: `No ${direction} runner`, type: "warning" });
      return;
    }

    setEditingRunner(nextRunner);
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
        <Stack className="gap-6 px-6 pt-8" direction="col">
          <h1 className="w-full text-4xl font-bold text-center uppercase font-display">
            Sequence {editingRunner.sequence}
          </h1>

          <Stack align="center" justify="between" className="w-full">
            <Button
              variant="ghost"
              color="primary"
              className="text-xl underline"
              onClick={() => handleChangeRunner("previous")}
            >
              {"< PREV"}
            </Button>
            <Button
              variant="ghost"
              color="primary"
              className="text-xl underline"
              onClick={() => handleChangeRunner("next")}
            >
              {"NEXT >"}
            </Button>
          </Stack>

          <Stack className="gap-4 w-full" direction="col">
            <TextInput label="Runner" placeholder="Runner" name="runner" value={editingRunner.id} />
            <TextInput
              label="In Time"
              placeholder="In Time"
              name="in"
              value={editingRunner.in.toLocaleString()}
            />
            <TextInput
              label="Out Time"
              placeholder="Out Time"
              name="out"
              value={editingRunner.out.toLocaleString()}
            />
            <TextInput label="Notes" placeholder="Notes" name="notes" value={editingRunner.notes} />
          </Stack>

          <Stack className="w-full" justify="end" align="center" direction="row">
            <Button variant="ghost" color="neutral" onClick={handleClose} size="lg">
              Cancel
            </Button>
            <Button variant="solid" color="primary" size="lg">
              Apply
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
