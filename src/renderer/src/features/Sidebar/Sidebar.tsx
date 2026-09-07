import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import DatabaseIcon from "~/assets/icons/database.svg?react";
import ExportIcon from "~/assets/icons/export.svg?react";
import HelpIcon from "~/assets/icons/help.svg?react";
import LogsIcon from "~/assets/icons/logs.svg?react";
import RosterIcon from "~/assets/icons/roster.svg?react";
import RunnerIcon from "~/assets/icons/runner.svg?react";
import SettingsIcon from "~/assets/icons/settings.svg?react";
import StationIcon from "~/assets/icons/station.svg?react";
import { Stack } from "~/components";
import { useAttachBackdrop } from "~/features/Backdrop";
import { EventManagerDialog } from "~/features/EventManager";
import { classed } from "~/lib/classed";
import { SidebarButton } from "./SidebarButton";
import { SidebarLink } from "./SidebarLink";
import { ThemeToggle } from "./ThemeToggle";

const SidebarElement = classed.div({
  base: "overflow-hidden fixed z-50 pt-[32px] pb-[8px] h-full duration-100 ease-in-out bg-surface-secondary transition-width group",
  variants: {
    open: {
      true: "w-[224px]",
      false: "w-[64px]"
    }
  }
});

enum SidebarMode {
  Expand,
  Collapse,
  Auto
}

export function Sidebar() {
  const mode = SidebarMode.Auto;
  const [expand, setExpand] = useState(false);
  const [eventManagerOpen, setEventManagerOpen] = useState(false);
  const expanded = expand;

  const location = useLocation();
  useEffect(() => setExpand(false), [location.pathname]);

  useAttachBackdrop(expanded);

  return (
    <SidebarElement
      open={expanded}
      onMouseEnter={() => mode === SidebarMode.Auto && setExpand(true)}
      onMouseLeave={() => mode === SidebarMode.Auto && setExpand(false)}
      onMouseMove={() => mode === SidebarMode.Auto && setExpand(true)}
    >
      <Stack direction="col" justify="between" className="h-full">
        <div>
          <SidebarLink to="/" icon={RunnerIcon}>
            Stats
          </SidebarLink>
          <SidebarLink to="/roster" icon={RosterIcon}>
            Roster
          </SidebarLink>
          <SidebarLink to="/stations" icon={StationIcon}>
            Stations
          </SidebarLink>
          <SidebarLink to="/logs" icon={LogsIcon}>
            Logs
          </SidebarLink>
          <SidebarLink to="/export" icon={ExportIcon}>
            Export
          </SidebarLink>
        </div>
        <div>
          <SidebarButton icon={DatabaseIcon} onClick={() => setEventManagerOpen(true)}>
            Event Manager
          </SidebarButton>
          <ThemeToggle />
          <SidebarLink to="/settings" icon={SettingsIcon}>
            Settings
          </SidebarLink>
          <SidebarLink to="/help" icon={HelpIcon}>
            Help
          </SidebarLink>
        </div>
      </Stack>
      <EventManagerDialog open={eventManagerOpen} setOpen={setEventManagerOpen} />
    </SidebarElement>
  );
}
