import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import ExportIcon from "~/assets/icons/export.svg?react";
import HelpIcon from "~/assets/icons/help.svg?react";
import LogsIcon from "~/assets/icons/logs.svg?react";
import RosterIcon from "~/assets/icons/roster.svg?react";
import RunnerIcon from "~/assets/icons/runner.svg?react";
import SettingsIcon from "~/assets/icons/settings.svg?react";
import StationIcon from "~/assets/icons/station.svg?react";
import { Stack } from "~/components";
import { useAttachBackdrop } from "~/features/Backdrop";
import { classed } from "~/lib/classed";
import { SidebarLink } from "./SidebarLink";
import { ThemeToggle } from "./ThemeToggle";

const SidebarElement = classed.div({
  base: "overflow-hidden fixed z-50 pt-8 pb-2 h-full duration-100 ease-in-out bg-surface-secondary transition-width group",
  variants: {
    open: {
      true: "w-56",
      false: "w-16"
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
          <ThemeToggle />
          <SidebarLink to="/settings" icon={SettingsIcon}>
            Settings
          </SidebarLink>
          <SidebarLink to="/help" icon={HelpIcon}>
            Help
          </SidebarLink>
        </div>
      </Stack>
    </SidebarElement>
  );
}
