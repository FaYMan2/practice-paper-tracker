/**
 * Which theme the dashboard is in, and who decided.
 *
 * Three states rather than two. "System" is not a synonym for whichever mode
 * the OS happens to be in right now: it is a standing instruction to follow it,
 * so a dashboard left open at dusk changes with everything else on the machine.
 * Collapsing it to a light/dark boolean loses that.
 *
 * The resolution itself is pure and lives here so it can be tested without a
 * DOM; the two lines that touch `document` and `localStorage` are below it.
 */

import { Monitor, MoonStar, Sun } from "lucide-react";
import { createElement } from "react";
import type { SegmentedOption } from "../../components/dashboard/ui";

export enum ThemePreference {
  Light = "light",
  Dark = "dark",
  System = "system",
}

/** Read by the inline script in the page head, so the name is load-bearing. */
export const THEME_KEY = "pptr-theme";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === ThemePreference.System) return prefersDark ? "dark" : "light";
  return preference === ThemePreference.Dark ? "dark" : "light";
}

/**
 * What was stored, or "system".
 *
 * Anything unrecognised reads as "system": a half-written value from an older
 * build should hand control back to the OS, not lock the page into a mode the
 * reader cannot see the reason for.
 */
export function readPreference(stored: string | null): ThemePreference {
  if (stored === ThemePreference.Light || stored === ThemePreference.Dark) return stored;
  return ThemePreference.System;
}

export const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: ThemePreference.Light, label: "Light", icon: createElement(Sun) },
  { value: ThemePreference.Dark, label: "Dark", icon: createElement(MoonStar) },
  { value: ThemePreference.System, label: "System", icon: createElement(Monitor) },
];

export const THEME_LABEL = "Colour theme";
