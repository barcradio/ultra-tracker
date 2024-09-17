import { Stack } from "~/components";
import { Clock } from "./Clock";

export function Header() {
  return (
    <Stack justify="between" align="center" className="p-4 bg-surface-low text-on-surface">
      <Clock />
      <h1 className="pr-8 text-3xl italic font-bold font-display">Ultra Tracker</h1>
    </Stack>
  );
}
