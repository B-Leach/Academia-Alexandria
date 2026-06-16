"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useColorTheme } from "@/components/color-theme-provider";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={colorTheme === "color"}
          onCheckedChange={(checked) =>
            setColorTheme(checked ? "color" : "mono")
          }
          aria-label="Toggle color theme"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          setTheme(resolvedTheme === "dark" ? "light" : "dark")
        }
        aria-label={
          resolvedTheme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
        }
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
