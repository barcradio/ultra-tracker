import { useState } from "react";
import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Stack } from "~/components";
import { Drawer } from "~/components/Drawer";
import { Runner } from "./useFakeData";

interface Props {
  runner: Runner;
}

export function EditRunner(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" color="primary" onClick={() => setIsOpen(true)}>
        <EditIcon width={20} height={20} />
      </Button>
      <Drawer
        open={isOpen}
        setOpen={setIsOpen}
        position="right"
        className="w-96 font-display"
        showCloseIcon={false}
      >
        <div className="px-6 pt-8">
          <h1 className="w-full text-4xl font-bold text-center uppercase font-display">
            Sequence {props.runner.sequence}
          </h1>

          <Stack align="center" justify="between" className="w-full">
            <Button variant="ghost" color="primary" className="text-xl underline">
              {"< PREV"}
            </Button>
            <Button variant="ghost" color="primary" className="text-xl underline">
              {"NEXT >"}
            </Button>
          </Stack>
        </div>
      </Drawer>
    </>
  );
}
