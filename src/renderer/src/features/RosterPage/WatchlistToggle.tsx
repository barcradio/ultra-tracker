import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "primereact/tooltip";
import BookmarkIcon from "~/assets/icons/bookmark.svg?react";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { useId } from "~/hooks/useId";
import { DatabaseStatus } from "$shared/enums";
import { AthleteStatusDB } from "$shared/models";
import { DatabaseResponse } from "$shared/types";

interface Props {
  athlete: AthleteStatusDB;
}

export function WatchlistToggle({ athlete }: Props) {
  const ipcRenderer = useIpcRenderer();
  const queryClient = useQueryClient();
  const tooltipId = useId("watchlist-toggle");
  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      const response = (await ipcRenderer.invoke(
        "toggle-watchlist",
        athlete.bibId
      )) as DatabaseResponse<boolean>;
      if (response[1] === DatabaseStatus.Error) throw new Error(response[2]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletes-table"] });
      queryClient.invalidateQueries({ queryKey: ["stats-table"] });
    }
  });

  return (
    <>
      <Tooltip target={`.${tooltipId}`} />
      <button
        type="button"
        className={`${tooltipId} h-7 w-7 p-1 ${athlete.watchlisted ? "fill-warning" : "fill-on-component"}`}
        data-pr-tooltip={athlete.watchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
        aria-label={athlete.watchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
        onClick={() => toggleWatchlist.mutate()}
      >
        <BookmarkIcon className="h-full w-full" />
      </button>
    </>
  );
}
