import { format } from "date-fns";

export function formatDate(date: Date) {
  return format(date, "kk:mm:ss dd LLL");
}
