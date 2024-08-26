import { Tooltip } from "primereact/tooltip";
import PhoneIcon from "~/assets/icons/phone.svg?react";
import { Button, Stack } from "~/components";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { formatPhone } from "~/lib/phone";
import { AthleteDB } from "$shared/models";
import { useToasts } from "../Toasts/useToasts";

interface Props {
  name: string;
  athlete: AthleteDB;
}
export function EmergencyContact(props: Props) {
  const portalRoot = usePortalRoot();
  const { createToast } = useToasts();
  const formattedPhone = formatPhone(props.athlete.emergencyPhone);

  const copyPhone = () => {
    createToast({ message: "Phone number copied to clipboard", type: "success" });
    navigator.clipboard.writeText(formattedPhone);
  };

  return (
    <Stack className="gap-2 text-on-component group" align="center">
      <p className="font-medium font-display">{props.name}</p>
      <Button variant="ghost" onClick={copyPhone} color="neutral" size="xs">
        <PhoneIcon
          className={`opacity-0 transition duration-100 cursor-pointer group-hover:opacity-100 fill-on-component phoneIcon-${props.athlete.bibId}`}
          height={20}
          width={20}
          onClick={() => copyPhone}
        />
      </Button>
      <Tooltip
        position="top"
        target={`.phoneIcon-${props.athlete.bibId}`}
        appendTo={portalRoot?.current}
      >
        {formattedPhone}
      </Tooltip>
    </Stack>
  );
}
