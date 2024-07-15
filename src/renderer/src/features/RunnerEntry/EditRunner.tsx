import EditIcon from "~/assets/icons/edit.svg?react";
import { Button, Stack } from "~/components";
import { Runner } from "./useFakeData";

interface Props {
  runner: Runner;
}

export function EditRunner(props: Props) {
  return (
    <>
      <Button
        variant="ghost"
        className="text-primary *:hover:text-primary-hover"
      >
        <EditIcon width={20} height={20} />
      </Button>
    </>
  );
}
