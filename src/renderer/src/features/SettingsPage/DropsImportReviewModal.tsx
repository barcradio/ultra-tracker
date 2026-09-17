import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Stack, Tag } from "~/components";
import { ColumnDef, DataGrid } from "~/features/DataGrid";
import {
  DropsImportConflict,
  DropsImportConflictAction,
  DropsImportPreview,
  DropsImportPreviewRecord
} from "$shared/types";

interface ConflictRow extends DropsImportConflict {
  selectedAction: DropsImportConflictAction;
}

interface Props {
  preview: DropsImportPreview | null;
  decisions: Record<string, DropsImportConflictAction>;
  applying: boolean;
  onDecisionChange: (conflictId: string, action: DropsImportConflictAction) => void;
  onBatchDecision: (action: DropsImportConflictAction | "recommended") => void;
  onApply: () => void;
  onCancel: () => void;
}

function formatStatus(reason: string | null, station: string | null, time: string | null) {
  return (
    <div className="min-w-0 text-sm leading-tight">
      <div className="font-bold truncate">{reason ?? "none"}</div>
      <div className="truncate opacity-80" title={station ?? "No station"}>
        {station ?? "No station"}
      </div>
      <div className="truncate opacity-70">{time ?? "No time"}</div>
    </div>
  );
}

function recommendationColor(confidence: DropsImportConflict["recommendationConfidence"]) {
  if (confidence === "high") return "turquoise";
  if (confidence === "medium") return "yellow";
  return "orange";
}

function actionLabel(action: DropsImportConflictAction) {
  return action === "use-imported" ? "Use Imported" : "Preserve Existing";
}

export function DropsImportReviewModal(props: Props) {
  const { preview } = props;
  const [activeView, setActiveView] = useState<"conflicts" | "ready" | "skipped" | "duplicates">(
    "conflicts"
  );

  useEffect(() => {
    if (preview) setActiveView("conflicts");
  }, [preview]);

  const conflicts: ConflictRow[] =
    preview?.conflicts.map((conflict) => ({
      ...conflict,
      selectedAction: props.decisions[conflict.id] ?? conflict.recommendedAction
    })) ?? [];

  const summaryRows = useMemo(() => {
    if (!preview) return [] as DropsImportPreviewRecord[];

    if (activeView === "conflicts") return [];
    if (activeView === "ready") return preview.readyRecords;
    if (activeView === "skipped") return preview.skippedRecords;
    return preview.duplicateRecords;
  }, [activeView, preview]);

  const importCount =
    (preview?.readyRecords.length ?? 0) +
    conflicts.filter((conflict) => conflict.selectedAction === "use-imported").length;

  const columns: ColumnDef<ConflictRow> = [
    {
      field: "bibId",
      name: "Bib",
      align: "right",
      sample: "9999"
    },
    {
      field: "existing",
      name: "Existing",
      render: (status) => formatStatus(status.dropReason, status.dropStation, status.dropDateTime),
      valueFn: ({ existing }) => `${existing.dropReason} ${existing.dropStation}`,
      sample: "did-not-start 0-start-line"
    },
    {
      field: "imported",
      name: "Imported",
      render: (status) => formatStatus(status.dropReason, status.dropStation, status.dropDateTime),
      valueFn: ({ imported }) => `${imported.dropReason} ${imported.dropStation}`,
      sample: "did-not-start 0-start-line"
    },
    {
      field: "recommendationReason",
      name: "Recommendation",
      flexible: true,
      sample: "The existing course drop is later firsthand station data than an imported DNS row.",
      render: (reason, row) => (
        <div className="min-w-0 max-w-[42rem] text-sm leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-bold truncate">{actionLabel(row.recommendedAction)}</span>
            <Tag color={recommendationColor(row.recommendationConfidence)}>
              {row.recommendationConfidence}
            </Tag>
          </div>
          <div className="opacity-80 whitespace-normal">{reason}</div>
        </div>
      )
    },
    {
      field: "selectedAction",
      name: "Action",
      sample: "Preserve Existing",
      render: (selectedAction, row) => (
        <Stack direction="col" className="gap-1 min-w-[9rem]" align="stretch">
          <Button
            type="button"
            size="sm"
            variant={selectedAction === "preserve-existing" ? "solid" : "outlined"}
            color="neutral"
            onClick={() => props.onDecisionChange(row.id, "preserve-existing")}
          >
            Preserve
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedAction === "use-imported" ? "solid" : "outlined"}
            color="primary"
            onClick={() => props.onDecisionChange(row.id, "use-imported")}
          >
            Import
          </Button>
        </Stack>
      )
    }
  ];

  const summaryButtons: Array<{
    id: "conflicts" | "ready" | "skipped" | "duplicates";
    label: string;
    count: number;
  }> = [
    { id: "conflicts", label: "Conflicts", count: preview?.conflicts.length ?? 0 },
    { id: "ready", label: "Ready", count: preview?.readyRecords.length ?? 0 },
    { id: "skipped", label: "Skipped", count: preview?.skippedRecords.length ?? 0 },
    { id: "duplicates", label: "Duplicates", count: preview?.duplicateRecords.length ?? 0 }
  ];

  const singleRecordColumns: ColumnDef<DropsImportPreviewRecord> = [
    { field: "bibId", name: "Bib", align: "right", width: "5rem", sample: "9999" },
    { field: "station", name: "Station", width: "16rem", sample: "7-franklin-trailhead" },
    { field: "status", name: "Drop Reason", width: "12rem", sample: "did-not-start" },
    { field: "dateTime", name: "Time", width: "18rem", sample: "2026-09-25T15:36:00.000Z" },
    {
      field: "reason",
      name: "Outcome",
      width: "22rem",
      minWidth: "18rem",
      sample: "Skipped: dropped at later station than current",
      flexible: true,
      render: (reason) => <div className="max-w-[42rem] whitespace-normal">{reason}</div>
    }
  ];
  const gridClassNames = {
    root: "h-full w-full min-w-0",
    table: "table-fixed w-full min-w-full",
    header: "text-sm"
  } as const;

  return (
    <Modal
      open={Boolean(preview)}
      setOpen={(open) => {
        if (!open) props.onCancel();
      }}
      title="Review Drops Import"
      size="xl"
      dismissOnClickOutside={false}
      showNegativeButton
      negativeText="Cancel Import"
      affirmativeText={props.applying ? "Applying..." : `Apply Import (${importCount})`}
      affirmativeDisabled={props.applying || !preview}
      onAffirmative={props.onApply}
      footerLeading={
        <Stack className="gap-2" align="center">
          <Button
            type="button"
            size="sm"
            variant="outlined"
            onClick={() => props.onBatchDecision("recommended")}
          >
            Apply Recommended
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outlined"
            color="neutral"
            onClick={() => props.onBatchDecision("preserve-existing")}
          >
            Preserve All
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outlined"
            onClick={() => props.onBatchDecision("use-imported")}
          >
            Import All
          </Button>
        </Stack>
      }
    >
      {preview && (
        <Stack
          direction="col"
          className="h-full min-h-[36rem] gap-3 min-w-0 max-w-full overflow-hidden"
        >
          <div className="grid grid-cols-5 gap-2 text-sm text-center min-w-0">
            {summaryButtons.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => setActiveView(button.id)}
                className={`rounded border px-2 py-3 transition ${
                  activeView === button.id
                    ? "border-gold bg-gold/10 text-on-component"
                    : "border-component-strong bg-component-strong text-on-component"
                }`}
              >
                <div className="font-bold">{button.count}</div>
                <div className="opacity-75">{button.label}</div>
              </button>
            ))}
          </div>

          <div className="text-sm text-on-component">
            File: <span className="font-bold break-all">{preview.sourceLabel}</span>
          </div>

          {activeView === "conflicts" ? (
            conflicts.length === 0 ? (
              <div className="p-4 text-center rounded bg-component-strong text-on-component">
                No conflicts found. Applying will import all ready rows.
              </div>
            ) : (
              <div className="flex-1 min-h-0 bg-component-strong">
                <DataGrid
                  data={conflicts}
                  columns={columns}
                  getKey={({ id }) => id}
                  classNames={gridClassNames}
                />
              </div>
            )
          ) : (
            <div className="flex-1 min-h-0 bg-component-strong">
              <DataGrid
                data={summaryRows}
                columns={singleRecordColumns}
                getKey={({ bibId, reason, station, dateTime }) =>
                  `${bibId}-${reason}-${station ?? "none"}-${dateTime ?? "none"}`
                }
                classNames={gridClassNames}
              />
            </div>
          )}
        </Stack>
      )}
    </Modal>
  );
}
