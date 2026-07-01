/**
 * theme-provider.tsx — client wrapper around next-themes' ThemeProvider.
 *
 * What:        Supplies light/dark theme context to the whole app using the
 *              class strategy (toggles a `.dark` class on <html>).
 * Where used:  Root layout, wrapping the entire tree.
 * Notes:       Light/dark only (system disabled). The `.dark` class it manages
 *              drives the token overrides in app/globals.css.
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
