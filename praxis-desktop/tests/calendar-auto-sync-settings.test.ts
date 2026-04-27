import { strict as assert } from "node:assert";
import {
  DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS,
  MAX_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES,
  MIN_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES,
  normalizeCalendarAutoSyncSettings,
} from "../shared/calendarAutoSyncSettings";

assert.deepEqual(normalizeCalendarAutoSyncSettings(), DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS);

assert.deepEqual(
  normalizeCalendarAutoSyncSettings({ enabled: false, intervalMinutes: 15 }),
  {
    enabled: false,
    intervalMinutes: 15,
  }
);

assert.equal(
  normalizeCalendarAutoSyncSettings({ intervalMinutes: 1 }).intervalMinutes,
  MIN_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES
);

assert.equal(
  normalizeCalendarAutoSyncSettings({ intervalMinutes: 5000 }).intervalMinutes,
  MAX_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES
);

assert.equal(
  normalizeCalendarAutoSyncSettings({ intervalMinutes: Number.NaN }, { enabled: false, intervalMinutes: 45 })
    .intervalMinutes,
  45
);

assert.equal(
  normalizeCalendarAutoSyncSettings({ intervalMinutes: 12.6 }).intervalMinutes,
  13
);

console.log("calendar auto-sync settings tests passed");
