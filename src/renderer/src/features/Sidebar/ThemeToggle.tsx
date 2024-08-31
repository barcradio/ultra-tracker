import ThemeIcon from "~/assets/icons/theme.svg?react";
import { useTheme } from "~/hooks/dom/useTheme";
import { SidebarButton } from "./SidebarButton";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <SidebarButton icon={ThemeIcon} onClick={toggleTheme}>
      Theme
    </SidebarButton>
  );
}
