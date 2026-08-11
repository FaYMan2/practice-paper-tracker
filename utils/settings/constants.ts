/** Settings storage key and defaults. Read/write lands in Phase 2. */

import type { Settings } from "../../types";

export const SETTINGS_KEY = "settings";

export const SETTINGS_STORAGE_ITEM = `local:${SETTINGS_KEY}` as const;

export const DEFAULT_SETTINGS: Settings = {
  showCrossTopicStars: true,
  showProgressStrip: true,
};
