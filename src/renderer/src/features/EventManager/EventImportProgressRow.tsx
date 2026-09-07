type ImportStatus = "pending" | "working" | "success" | "error";

interface EventImportProgressRowProps {
  label: string;
  status: ImportStatus;
}

export function EventImportProgressRow({ label, status }: EventImportProgressRowProps) {
  const statusText = {
    pending: "Pending",
    working: "Loading...",
    success: "Complete",
    error: "Failed"
  }[status];

  return (
    <div className="flex items-center justify-between border-b border-component py-3 last:border-b-0">
      <span>{label}</span>
      <span
        className={
          status === "success" ? "text-success" : status === "error" ? "text-danger" : "opacity-70"
        }
      >
        {status === "working" ? "..." : statusText}
      </span>
    </div>
  );
}
