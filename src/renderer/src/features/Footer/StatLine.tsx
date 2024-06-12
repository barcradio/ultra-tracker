import { Stack } from "~/components";

interface StatLineProps {
  label: string;
  value: number;
}

export function StatLine({ label, value }: StatLineProps) {
  return (
    <Stack justify="between" className="w-full text-slate-400">
      <span>{label}:</span>
      <span>{value}</span>
    </Stack>
  );
}
