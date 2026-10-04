"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

import { shellStrings } from "./strings";

const OPTIONS = [
  { value: "light", label: shellStrings.theme.light, Icon: Sun },
  { value: "dark", label: shellStrings.theme.dark, Icon: Moon },
  { value: "system", label: shellStrings.theme.system, Icon: Monitor },
] as const;

// Theme choice inside the user menu.
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{shellStrings.theme.label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuRadioItem key={value} value={value}>
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
