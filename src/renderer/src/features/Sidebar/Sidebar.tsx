import DatabaseIcon from "~/assets/icons/database.svg?react";
import HelpIcon from "~/assets/icons/help.svg?react";
import LogsIcon from "~/assets/icons/logs.svg?react";
import RunnerIcon from "~/assets/icons/runner.svg?react";
import SearchIcon from "~/assets/icons/search.svg?react";
import SettingsIcon from "~/assets/icons/settings.svg?react";
import { Stack } from "~/components";
import { SidebarLink } from "./SidebarLink";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  return (
    <div className="mt-8 w-56 bg-surface-lowest">
      <Stack direction="col" justify="between" className="h-full">
        <div className="">
          <SidebarLink to="/" icon={RunnerIcon}>
            Stats
          </SidebarLink>
          <SidebarLink to="/" icon={SearchIcon}>
            Search
          </SidebarLink>
          <SidebarLink to="/" icon={LogsIcon}>
            Logs
          </SidebarLink>
          <SidebarLink to="/" icon={DatabaseIcon}>
            Database
          </SidebarLink>
        </div>
        <div className="">
          <ThemeToggle />
          <SidebarLink to="/settings" icon={SettingsIcon}>
            Settings
          </SidebarLink>
          <SidebarLink to="/" icon={HelpIcon}>
            Help
          </SidebarLink>
        </div>
      </Stack>
    </div>
  );
}
