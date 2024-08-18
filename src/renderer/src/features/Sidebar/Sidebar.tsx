import { useState } from "react";
import DatabaseIcon from "~/assets/icons/database.svg?react";
import HelpIcon from "~/assets/icons/help.svg?react";
import LogsIcon from "~/assets/icons/logs.svg?react";
import RunnerIcon from "~/assets/icons/runner.svg?react";
import SearchIcon from "~/assets/icons/search.svg?react";
import SettingsIcon from "~/assets/icons/settings.svg?react";
import { Stack } from "~/components";
import { classed } from "~/lib/classed";
import { SidebarLink } from "./SidebarLink";
import { ThemeToggle } from "./ThemeToggle";

const SidebarElement = classed.div({
  base: "overflow-hidden relative pt-8 pb-2 duration-200 ease-in-out bg-surface-secondary transition-width group",
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
  // TODO: Implement this setting in the settings page / database
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mode, setMode] = useState(SidebarMode.Auto);
  const [expand, setExpand] = useState(false);
  const expanded = mode === SidebarMode.Expand || (mode === SidebarMode.Auto && expand);

  return (
    <SidebarElement
      open={expanded}
      onMouseEnter={() => mode === SidebarMode.Auto && setExpand(true)}
      onMouseLeave={() => mode === SidebarMode.Auto && setExpand(false)}
    >
      <Stack direction="col" justify="between" className="h-full">
        <div>
          <SidebarLink to="/" icon={RunnerIcon}>
            Stats
          </SidebarLink>
          <SidebarLink to="/search" icon={SearchIcon}>
            Search
          </SidebarLink>
          <SidebarLink to="/logs" icon={LogsIcon}>
            Logs
          </SidebarLink>
          <SidebarLink to="/database" icon={DatabaseIcon}>
            Database
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
