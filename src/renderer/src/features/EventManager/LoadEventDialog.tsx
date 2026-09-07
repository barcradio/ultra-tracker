import { MouseEvent, useEffect, useState } from "react";
import DatabaseIcon from "~/assets/icons/database.svg?react";
import XMarkIcon from "~/assets/icons/xmark.svg?react";
import { Button } from "~/components/Button";
import { ConfirmationModal } from "~/components/ConfirmationModal";
import { Modal } from "~/components/Modal";
import { Stack } from "~/components/Stack";
import { Tag } from "~/components/Tag";
import { useOpenEventManagerOnStartup } from "~/hooks/useOpenEventManagerOnStartup";
import { formatDate, formatShortDate } from "~/lib/datetimes";
import { DatabaseStatus } from "$shared/enums";
import { EventDatabaseMetadata } from "$shared/models";
import {
  useDeleteEventDatabase,
  useLoadEventDatabase,
  useRestoreEventDatabaseBackup
} from "./hooks/useEventDatabaseMutations";
import {
  useActiveDatabaseSlug,
  useEventDatabaseBackups,
  useEventDatabases
} from "./hooks/useEventDatabases";

export interface LoadEventDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onStartNew: () => void;
}

function formatEventTitle(slug: string): string {
  const duplicateMatch = slug.match(/^(.*)-(\d+)$/);
  const duplicateNumber = duplicateMatch?.[2];
  const isYear = duplicateNumber != null && /^(19|20)\d{2}$/.test(duplicateNumber);
  const eventSlug = duplicateMatch && !isYear ? duplicateMatch[1] : slug;
  const duplicateLabel = duplicateMatch && !isYear ? ` #${duplicateNumber}` : "";

  return (
    eventSlug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") + duplicateLabel
  );
}

export function LoadEventDialog(props: LoadEventDialogProps) {
  const { open, setOpen, onStartNew } = props;
  const { data: eventDatabases, isLoading } = useEventDatabases();
  const { data: eventBackups, isLoading: areBackupsLoading } = useEventDatabaseBackups();
  const { data: activeSlug } = useActiveDatabaseSlug();
  const { enabled: openOnStartup, setEnabled: setOpenOnStartup } = useOpenEventManagerOnStartup();

  const loadMutation = useLoadEventDatabase();
  const deleteMutation = useDeleteEventDatabase();
  const restoreMutation = useRestoreEventDatabaseBackup();

  const [view, setView] = useState<"databases" | "backups">("databases");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventDatabaseMetadata | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<EventDatabaseMetadata | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const visibleEvents = view === "databases" ? eventDatabases : eventBackups;
  const isLoadingVisibleEvents = view === "databases" ? isLoading : areBackupsLoading;

  // Default to the active database or first database without replacing a user selection.
  useEffect(() => {
    if (!open) {
      setSelectedSlug(null);
      return;
    }

    if (visibleEvents && visibleEvents.length > 0) {
      setSelectedSlug((currentSlug) => {
        if (currentSlug && visibleEvents.some((db) => db.slug === currentSlug)) return currentSlug;
        if (
          view === "databases" &&
          activeSlug &&
          visibleEvents.some((db) => db.slug === activeSlug)
        ) {
          return activeSlug;
        }
        return visibleEvents[0].slug;
      });
    }
  }, [open, visibleEvents, activeSlug, view]);

  const selectedEvent = visibleEvents?.find((db) => db.slug === selectedSlug) ?? null;

  const handleLoad = () => {
    if (!selectedSlug) return;
    sessionStorage.setItem("skip-event-manager-auto-open", "true");
    loadMutation.mutate(selectedSlug);
  };

  const handleDeleteClick = (e: MouseEvent, eventDb: EventDatabaseMetadata) => {
    e.stopPropagation();
    setEventToDelete(eventDb);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    deleteMutation.mutate(
      { slug: eventToDelete.slug, type: eventToDelete.type },
      {
        onSuccess: () => {
          if (selectedSlug === eventToDelete.slug) {
            setSelectedSlug(null);
          }
          setEventToDelete(null);
        }
      }
    );
  };

  const restoreBackup = (backup: EventDatabaseMetadata, allowRename: boolean) => {
    sessionStorage.setItem("skip-event-manager-auto-open", "true");
    restoreMutation.mutate(
      { slug: backup.slug, allowRename },
      {
        onSuccess: ([, status]) => {
          if (status === DatabaseStatus.Duplicate) {
            sessionStorage.removeItem("skip-event-manager-auto-open");
            setBackupToRestore(backup);
            setRestoreModalOpen(true);
          } else if (status !== DatabaseStatus.Created) {
            sessionStorage.removeItem("skip-event-manager-auto-open");
          }
        },
        onError: () => sessionStorage.removeItem("skip-event-manager-auto-open")
      }
    );
  };

  const handleRestore = () => {
    if (selectedEvent) restoreBackup(selectedEvent, false);
  };

  const handleConfirmRestore = () => {
    if (backupToRestore) restoreBackup(backupToRestore, true);
  };

  const isAffirmativeDisabled =
    !selectedSlug ||
    (view === "databases" && selectedSlug === activeSlug) ||
    loadMutation.isPending ||
    restoreMutation.isPending;

  return (
    <>
      <Modal
        open={open}
        setOpen={setOpen}
        title="Load Event"
        size="lg"
        footerLeading={
          <Stack align="center" className="gap-4">
            {view === "databases" && (
              <Button type="button" variant="outlined" color="neutral" onClick={onStartNew}>
                Create New Event
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-on-component">
              <input
                type="checkbox"
                aria-label="Open Event Manager on Startup"
                checked={openOnStartup}
                onChange={(e) => setOpenOnStartup(e.target.checked)}
              />
              <span>Open Event Manager on Startup</span>
            </div>
          </Stack>
        }
        showNegativeButton
        negativeText="Cancel"
        affirmativeText={
          view === "backups"
            ? restoreMutation.isPending
              ? "Restoring..."
              : "Restore Backup"
            : loadMutation.isPending
              ? "Loading..."
              : "Load Event"
        }
        onAffirmative={view === "backups" ? handleRestore : handleLoad}
        affirmativeDisabled={isAffirmativeDisabled}
      >
        <div className="flex gap-4 h-[22rem]">
          {/* Left pane: Event Tiles */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="mb-2 flex text-sm font-semibold text-on-surface">
              <button
                type="button"
                aria-pressed={view === "databases"}
                onClick={() => setView("databases")}
                className={`border-b-2 px-2 py-1 ${view === "databases" ? "border-primary text-on-surface-hover" : "border-transparent opacity-70"}`}
              >
                Events
              </button>
              <button
                type="button"
                aria-pressed={view === "backups"}
                onClick={() => setView("backups")}
                className={`border-b-2 px-2 py-1 ${view === "backups" ? "border-primary text-on-surface-hover" : "border-transparent opacity-70"}`}
              >
                Backups
              </button>
            </div>
            <div className="flex-1 pr-1 overflow-y-auto space-y-2">
              {isLoadingVisibleEvents && (
                <div className="p-4 text-center text-on-surface opacity-70">
                  Loading event databases...
                </div>
              )}

              {!isLoadingVisibleEvents && (!visibleEvents || visibleEvents.length === 0) && (
                <div className="p-4 text-center text-on-surface opacity-70">
                  {view === "databases"
                    ? "No saved event databases found."
                    : "No event backups found."}
                </div>
              )}

              {!isLoadingVisibleEvents &&
                visibleEvents?.map((item) => {
                  const isSelected = item.slug === selectedSlug;
                  const isActive = item.slug === activeSlug;
                  const formattedDate = item.lastModified
                    ? formatShortDate(new Date(item.lastModified))
                    : "Unknown";

                  return (
                    <div
                      key={item.slug}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSlug(item.slug)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedSlug(item.slug);
                        }
                      }}
                      className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        isSelected
                          ? "bg-component-strong border-primary text-on-surface-hover"
                          : "bg-component border-component-strong hover:border-component text-on-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <DatabaseIcon className="w-4 h-4 shrink-0 fill-current" />
                            <span className="font-bold truncate text-base">
                              {formatEventTitle(item.slug)}
                            </span>
                          </div>
                          <div className="text-xs opacity-75 mt-1">Modified: {formattedDate}</div>
                        </div>

                        {!isActive && (
                          <button
                            type="button"
                            title={`Delete event ${item.name || item.slug}`}
                            onClick={(e) => handleDeleteClick(e, item)}
                            className="p-1 rounded text-danger hover:bg-danger/20 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4 fill-current" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.type === "database" && isActive && (
                          <Tag color="turquoise">Active</Tag>
                        )}
                        {item.type === "backup" && <Tag color="purple">Backup</Tag>}
                        {item.error === "unreadable" && <Tag color="red">Unreadable</Tag>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right pane: Metadata detail */}
          <div className="w-5/12 bg-surface-tertiary p-4 rounded-lg flex flex-col justify-between overflow-y-auto">
            {selectedEvent ? (
              <div className="space-y-3 text-sm text-on-surface">
                <div className="border-b border-component pb-2">
                  <div className="text-xs uppercase font-semibold text-on-surface opacity-60">
                    Event Details
                  </div>
                  <div className="text-lg font-bold text-on-surface-hover truncate">
                    {formatEventTitle(selectedEvent.slug)}
                  </div>
                  <div className="text-xs font-mono opacity-75">{selectedEvent.slug}</div>
                </div>

                {selectedEvent.error === "unreadable" ? (
                  <div className="p-2 text-danger bg-danger/10 rounded border border-danger/30 text-xs">
                    This database file could not be read properly or is corrupted.
                  </div>
                ) : (
                  <Stack direction="col" className="gap-2">
                    <div className="flex justify-between">
                      <span className="opacity-75">Timing Records:</span>
                      <span className="font-semibold">{selectedEvent.timingRecordCount ?? 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="opacity-75">Athletes:</span>
                      <span className="font-semibold">{selectedEvent.athleteCount ?? 0}</span>
                    </div>

                    {selectedEvent.startline && (
                      <div className="flex justify-between">
                        <span className="opacity-75">Start Line:</span>
                        <span className="font-semibold truncate max-w-[10rem]">
                          {selectedEvent.startline}
                        </span>
                      </div>
                    )}

                    {selectedEvent.finishline && (
                      <div className="flex justify-between">
                        <span className="opacity-75">Finish Line:</span>
                        <span className="font-semibold truncate max-w-[10rem]">
                          {selectedEvent.finishline}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="opacity-75">Last Modified:</span>
                      <span className="font-semibold text-xs">
                        {selectedEvent.lastModified
                          ? formatDate(new Date(selectedEvent.lastModified))
                          : "N/A"}
                      </span>
                    </div>
                  </Stack>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs opacity-60 p-4">
                Select an event from the list to view details
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <ConfirmationModal
          superDangerous
          open={deleteModalOpen}
          setOpen={setDeleteModalOpen}
          title={eventToDelete.type === "backup" ? "Delete Backup" : "Delete Event"}
          negativeText="Cancel"
          affirmativeText="Delete"
          onAffirmative={handleConfirmDelete}
        >
          Are you sure you want to delete the{" "}
          {eventToDelete.type === "backup" ? "backup" : "event database"} &quot;
          {eventToDelete.slug}&quot;?
          {eventToDelete.type === "database" &&
            " All timing records and athlete data for this event will be permanently deleted."}
        </ConfirmationModal>
      )}

      {backupToRestore && (
        <Modal
          open={restoreModalOpen}
          setOpen={setRestoreModalOpen}
          title="Restore Backup"
          showNegativeButton
          negativeText="Cancel"
          affirmativeText="Restore as New Event"
          onAffirmative={handleConfirmRestore}
        >
          An event database named &quot;{backupToRestore.name || backupToRestore.slug}&quot; already
          exists. The backup will be restored as a new event using the next available name.
        </Modal>
      )}
    </>
  );
}
