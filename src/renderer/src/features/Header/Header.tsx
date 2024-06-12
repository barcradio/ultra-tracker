import { Stack } from "~/common/components/Stack";
import { BibForm } from "./BibForm";
import { Clock } from "./Clock";

export function Header() {
  return (
    <Stack justify="between" align="center" className=" bg-slate-800 p-4 text-slate-100">
      <Clock />
      <h1 className="font-display text-3xl font-bold">Ultra Tracker</h1>
      <BibForm />
    </Stack>
  );
}
