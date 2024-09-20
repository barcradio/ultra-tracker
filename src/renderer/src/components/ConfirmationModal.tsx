import { ReactNode, useState } from "react";
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
  };

  const getAffirmativeText = () => {
    if (!props.superDangerous) return props.affirmativeText;
    if (!isConfirming) return "I understand";
    return props.title;
  };

  return (
    <Modal
      title={props.title}
      open={props.open}
      negativeText={props.negativeText}
      setOpen={handleClose}
      showNegativeButton
      onAffirmative={handleAffirmClick}
      affirmativeText={getAffirmativeText()}
      dangerous={props.dangerous || isConfirming}
      affirmativeDisabled={props.superDangerous && isConfirming && !confirmed}
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
