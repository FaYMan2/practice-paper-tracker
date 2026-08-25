import { describe, expect, it } from "vitest";
import { ThemePreference, readPreference, resolveTheme } from "../utils/dashboard";

describe("which theme to paint", () => {
  it("follows the machine while the preference is system", () => {
    // Not a synonym for whichever mode the OS is in right now: it is a standing
    // instruction, so a dashboard left open across dusk turns with everything else.
    expect(resolveTheme(ThemePreference.System, true)).toBe("dark");
    expect(resolveTheme(ThemePreference.System, false)).toBe("light");
  });

  it("ignores the machine once a mode has been chosen", () => {
    expect(resolveTheme(ThemePreference.Light, true)).toBe("light");
    expect(resolveTheme(ThemePreference.Dark, false)).toBe("dark");
  });

  it("hands control back to the machine for anything it cannot read", () => {
    // A half-written value from an older build must not lock the page into a
    // mode with no visible reason for it.
    expect(readPreference(null)).toBe(ThemePreference.System);
    expect(readPreference("sepia")).toBe(ThemePreference.System);
    expect(readPreference("dark")).toBe(ThemePreference.Dark);
  });
});
