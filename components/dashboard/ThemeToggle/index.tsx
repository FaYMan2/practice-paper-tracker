/**
 * Light, dark, or whatever the machine says.
 *
 * The page head has already resolved the theme before React runs, so this
 * control's job is only to change it afterwards and to keep following the
 * system while the preference is "system" — a dashboard left open across sunset
 * should turn with everything else rather than waiting for a reload.
 */

import { useEffect, useState } from "react";
import {
  THEME_KEY,
  THEME_LABEL,
  THEME_OPTIONS,
  ThemePreference,
  readPreference,
  resolveTheme,
} from "../../../utils/dashboard";
import { Segmented } from "../ui";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function stored(): ThemePreference {
  try {
    return readPreference(localStorage.getItem(THEME_KEY));
  } catch {
    // Storage can be blocked. Following the system is the safe answer.
    return ThemePreference.System;
  }
}

function paint(preference: ThemePreference): void {
  document.documentElement.dataset["theme"] = resolveTheme(
    preference,
    matchMedia(DARK_QUERY).matches,
  );
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(stored);

  useEffect(() => {
    paint(preference);
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Not fatal: the theme still applies for this session.
    }

    if (preference !== ThemePreference.System) return;
    const query = matchMedia(DARK_QUERY);
    const follow = () => paint(ThemePreference.System);
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [preference]);

  return (
    <Segmented
      options={THEME_OPTIONS}
      value={preference}
      onChange={setPreference}
      label={THEME_LABEL}
      iconOnly
    />
  );
}
