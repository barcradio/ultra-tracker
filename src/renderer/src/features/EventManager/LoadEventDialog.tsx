import { MouseEvent, useEffect, useState } from "react";
import DatabaseIcon from "~/assets/icons/database.svg?react";
import XMarkIcon from "~/assets/icons/xmark.svg?react";
import { ConfirmationModal } from "~/components/ConfirmationModal";
import { Modal } from "~/components/Modal";
import { Stack } from "~/components/Stack";
import { Tag } from "~/components/Tag";
import { formatDate, formatShortDate } from "~/lib/datetimes";
import { EventDatabaseMetadata } from "$shared/models";
import { useDeleteEventDatabase, useLoadEventDatabase } from "./hooks/useEventDatabaseMutations";
import { useActiveDatabaseSlug, useEventDatabases } from "./hooks/useEventDatabases";

export interface LoadEventDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function LoadEventDialog(props: LoadEventDialogProps) {
  const { open, setOpen } = props;
  const { data: eventDatabases, isLoading } = useEventDatabases();
  const { data: activeSlug } = useActiveDatabaseSlug();

  const loadMutation = useLoadEventDatabase();
  const deleteMutation = useDeleteEventDatabase();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventDatabaseMetadata | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Auto-select active database or first database when opened / data loaded
  useEffect(() => {
    if (!open) {
      setSelectedSlug(null);
      return;
    }

    if (eventDatabases && eventDatabases.length > 0) {
      if (activeSlug && eventDatabases.some((db) => db.slug === activeSlug)) {
        setSelectedSlug(activeSlug);
      } else if (!selectedSlug || !eventDatabases.some((db) => db.slug === selectedSlug)) {
        setSelectedSlug(eventDatabases[0].slug);
      }
    }
  }, [open, eventDatabases, activeSlug, selectedSlug]);

  const selectedEvent = eventDatabases?.find((db) => db.slug === selectedSlug) ?? null;

  const handleLoad = () => {
    if (!selectedSlug) return;
    loadMutation.mutate(selectedSlug);
  };

  const handleDeleteClick = (e: MouseEvent, eventDb: EventDatabaseMetadata) => {
    e.stopPropagation();
    setEventToDelete(eventDb);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    deleteMutation.mutate(eventToDelete.slug, {
      onSuccess: () => {
        if (selectedSlug === eventToDelete.slug) {
          setSelectedSlug(null);
        }
        setEventToDelete(null);
      }
    });
  };

  const isAffirmativeDisabled =
    !selectedSlug || selectedSlug === activeSlug || loadMutation.isPending;

  return (
    <>
      <Modal
        open={open}
        setOpen={setOpen}
        title="Load Event"
        size="lg"
        showNegativeButton
        negativeText="Cancel"
        affirmativeText={loadMutation.isPending ? "Loading..." : "Load Event"}
        onAffirmative={handleLoad}
        affirmativeDisabled={isAffirmativeDisabled}
      >
        <div className="flex gap-4 h-[22rem]">
          {/* Left pane: Event Tiles */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-sm font-semibold mb-2 text-on-surface">
              Select an Event Database
            </div>
            <div className="flex-1 pr-1 overflow-y-auto space-y-2">
              {isLoading && (
                <div className="p-4 text-center text-on-surface opacity-70">
                  Loading event databases...
                </div>
              )}

              {!isLoading && (!eventDatabases || eventDatabases.length === 0) && (
                <div className="p-4 text-center text-on-surface opacity-70">
                  No saved event databases found.
                </div>
              )}

              {!isLoading &&
                eventDatabases?.map((item) => {
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
                              {item.name || item.slug}
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
                        {isActive && <Tag color="turquoise">Active</Tag>}
                        {item.hasBackup && <Tag color="purple">Backup</Tag>}
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
                    {selectedEvent.name || selectedEvent.slug}
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

                    <div className="flex justify-between">
                      <span className="opacity-75">Backup File:</span>
                      <span className="font-semibold">
                        {selectedEvent.hasBackup ? "Yes" : "No"}
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
          title="Delete Event"
          negativeText="Cancel"
          affirmativeText="Delete"
          onAffirmative={handleConfirmDelete}
        >
          Are you sure you want to delete the event database &quot;
          {eventToDelete.name || eventToDelete.slug}&quot;? All timing records and athlete data for
          this event will be permanently deleted.
        </ConfirmationModal>
      )}
    </>
  );
}
