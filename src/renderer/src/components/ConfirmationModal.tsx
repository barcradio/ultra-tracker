import { ReactNode, useState } from "react";
import { useCountdown } from "~/hooks/useCountdown";
import { Modal, ModalAffirmProps } from "./Modal";
import { TextInput } from "./TextInput";

interface Props extends Omit<ModalAffirmProps, "affirmativeText"> {
  children: ReactNode;
  affirmativeText?: string;
  dangerous?: boolean;
  superDangerous?: boolean;
}

export function ConfirmationModal(props: Props) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const confirmed = confirmation === String(props.title).toLowerCase();

  const enableCounter = props.open && props.superDangerous && !isConfirming && !confirmed;
  const { countdown, resetCountdown } = useCountdown(5, { enable: enableCounter });

  const handleAffirmClick = () => {
    if (!props.superDangerous || confirmed) {
      props.onAffirmative();
      handleClose();
    } else {
      setIsConfirming(true);
    }
  };

  const handleClose = () => {
    props.setOpen(false);
    setIsConfirming(false);
    setConfirmation("");
    resetCountdown();
  };

  const getAffirmativeProps = (): [ReactNode, boolean] => {
    if (!props.superDangerous) return [props.affirmativeText, false];
    if (!isConfirming && countdown > 0) return [`I understand (${countdown})`, true];
    if (!isConfirming) return ["I understand", false];
    if (isConfirming && !confirmed) return [props.title, true];
    return [props.title, false];
  };

  const [affirmativeText, affirmativeDisabled] = getAffirmativeProps();

  return (
    <Modal
      title={props.title}
      open={props.open}
      negativeText={props.negativeText}
      setOpen={handleClose}
      showNegativeButton
      onAffirmative={handleAffirmClick}
      affirmativeText={affirmativeText}
      affirmativeDisabled={affirmativeDisabled}
      dangerous={props.dangerous || isConfirming}
    >
      {!isConfirming && (
        <div className="text-center">
          {props.children}
          <p className="font-medium text-danger mt-1"> This action cannot be undone.</p>
        </div>
      )}

      {isConfirming && (
        <div>
          <p className="font-medium text-center">
            Please type <span className="font-bold lowercase">&apos;{props.title}&apos;</span> to
            confirm.
          </p>
          <TextInput
            onChange={(e) => setConfirmation(e.target.value)}
            className="border-2 border-danger/50"
          />
        </div>
      )}
    </Modal>
  );
}
