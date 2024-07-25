import ThemeIcon from "~/assets/icons/theme.svg?react";
import { SidebarButton } from "./SidebarButton";

export function ThemeToggle() {
  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle("dark");
    html.classList.toggle("light");
  };

  return (
    <SidebarButton icon={ThemeIcon} onClick={toggleTheme}>
      Theme
    </SidebarButton>
  );
}
