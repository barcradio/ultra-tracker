import { useLayoutEffect } from "react";
import { useLocalStorage } from "@uidotdev/usehooks";

enum Theme {
  Dark = "dark",
  Light = "light"
}

export function useTheme() {
  const [theme, setTheme] = useLocalStorage("applicationTheme", Theme.Dark);

  useLayoutEffect(() => {
    document.documentElement.removeAttribute("class");
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
  };

  return { toggleTheme, theme };
}
