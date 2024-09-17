import { format } from "date-fns";

export function formatDate(date: Date | null): string {
  if (date == null) return "";

  return format(date, "HH:mm:ss dd LLL");
}
