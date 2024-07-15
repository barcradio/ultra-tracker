import { useState } from "react";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Drawer, Stack } from "~/components";
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
        <div className="px-6 pt-8">
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
        </div>
      </Drawer>
    </>
  );
}
