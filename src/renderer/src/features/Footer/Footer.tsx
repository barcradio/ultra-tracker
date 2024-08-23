import BarcLogo from "~/assets/barc.svg";
import { Stack } from "~/components";

const useIdentity = () => {
  return {
    aidStation: "12 Ranger Dip",
    callsign: "N8MLS"
  };
};

export function Footer() {
  const { aidStation, callsign } = useIdentity();

  return (
    <Stack
      justify="between"
      align="center"
      className="py-6 pl-4 mx-4 mb-4 text-lg bg-component font-display"
    >
      <Stack direction="col">
        <p className="text-on-component">
          <span className="font-bold">Aid Station</span> - {aidStation}
        </p>
        <p className="text-on-component">
          <span className="font-bold">Operator Callsign</span> - {callsign}
        </p>
      </Stack>

      <img src={BarcLogo} alt="Barc Logo" className="pr-4" width="180px" />
    </Stack>
  );
}
