"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light / dark / system theme (D-041). The choice is stored in localStorage by next-themes.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
