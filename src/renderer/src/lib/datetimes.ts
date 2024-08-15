import { format } from "date-fns";

export function formatDate(date: Date | null): Date | string {
  if (date == null) return "";

  return format(date, "HH:mm:ss dd LLL");
}
