"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "mono" | "color";

const ColorThemeContext = createContext<{
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}>({
  colorTheme: "mono",
  setColorTheme: () => {},
});

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("mono");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("color-theme") as ColorTheme | null;
    if (stored === "color") {
      setColorTheme("color");
      document.documentElement.classList.add("theme-color");
    }
  }, []);

  const handleSet = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem("color-theme", theme);
    if (theme === "color") {
      document.documentElement.classList.add("theme-color");
    } else {
      document.documentElement.classList.remove("theme-color");
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme: handleSet }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  return useContext(ColorThemeContext);
}
