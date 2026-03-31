/** Admin week/day calendar: one hour row height (4 × 15-min cells). */
export const ADMIN_CALENDAR_HOUR_ROW_PX = 96; // 50% taller than legacy 64px for easier reading / drag
export const ADMIN_SLOT_INTERVAL_MIN = 15;
const QUARTERS_PER_HOUR = 60 / ADMIN_SLOT_INTERVAL_MIN; // 4

export const pxPerQuarter = ADMIN_CALENDAR_HOUR_ROW_PX / QUARTERS_PER_HOUR;

/**
 * Pixel height for an appointment block (matches 15-min grid cells; excludes gap fudge).
 */
export function adminCalendarBlockHeightPx(durationMinutes: number): number {
  const quarters = Math.max(
    1,
    Math.ceil(Math.max(1, durationMinutes) / ADMIN_SLOT_INTERVAL_MIN)
  );
  return Math.round(quarters * pxPerQuarter - 2);
}

/**
 * Vertical offset from top of the day column (8:00 = 0) using actual clock time.
 */
export function adminAppointmentTopPxFromStart(start: Date, gridStartHour: number): number {
  const startMin = start.getHours() * 60 + start.getMinutes();
  const gridStartMin = gridStartHour * 60;
  const rel = startMin - gridStartMin;
  const clamped = Math.max(0, rel);
  return (clamped / 15) * pxPerQuarter;
}

/**
 * Proportional height from duration (same scale as top). Min keeps tiny slots clickable.
 */
export function adminAppointmentDurationHeightPx(
  durationMinutes: number,
  minPx = 14
): number {
  const raw = (Math.max(1, durationMinutes) / 15) * pxPerQuarter;
  return Math.max(minPx, Math.round(raw) - 2);
}

export type TimedOverlayEntry = {
  id: string;
  startMs: number;
  durationMinutes: number;
};

/**
 * Heights that never extend past the next timed event (or grid end), so cards stay visually separate.
 */
export function computeTimedOverlayHeightsPx(
  sortedTimed: TimedOverlayEntry[],
  gridStartHour: number,
  gridEndHour: number
): Map<string, number> {
  const gridBottomPx = (gridEndHour - gridStartHour) * ADMIN_CALENDAR_HOUR_ROW_PX;
  const out = new Map<string, number>();

  for (let i = 0; i < sortedTimed.length; i++) {
    const cur = sortedTimed[i];
    const start = new Date(cur.startMs);
    const topPx = adminAppointmentTopPxFromStart(start, gridStartHour);
    const dur = Math.max(1, cur.durationMinutes);
    const idealPx = (dur / 15) * pxPerQuarter - 2;

    const nextTopPx =
      i + 1 < sortedTimed.length
        ? adminAppointmentTopPxFromStart(
            new Date(sortedTimed[i + 1].startMs),
            gridStartHour
          )
        : gridBottomPx;

    const gapPx = nextTopPx - topPx - 2;
    /** Vertical breathing room between back-to-back 15-min-aligned events. */
    const GAP = 3;
    const h =
      gapPx <= 0
        ? Math.max(10, idealPx)
        : Math.min(Math.max(10, idealPx - GAP), Math.max(10, gapPx - GAP));
    out.set(cur.id, Math.round(h));
  }
  return out;
}

/** Legacy exports (still used by tests / tooling). Prefer `adminCalendarSlotTier`. */
export const ADMIN_COMPACT_SERVICE_ONLY_MIN_MIN = 15;
export const ADMIN_COMPACT_SERVICE_ONLY_MAX_MIN = 30;
export const ADMIN_SHORT_APPOINTMENT_MAX_MIN = 45;
export const ADMIN_SHORT_APPOINTMENT_MIN_BLOCK_PX = 52;

/** Visual density for timed grid cells (15-min aligned durations). */
export type AdminCalendarSlotTier = "micro" | "compact" | "short" | "medium" | "full";

/**
 * Base tier from duration only (grid is 15-min aligned).
 * - micro ≤15 · compact ≤30 · short ≤45 · medium ≤60 · full 60+
 */
export function adminCalendarSlotTier(durationMinutes: number): AdminCalendarSlotTier {
  const d = Math.max(0, Math.round(durationMinutes));
  if (d <= 15) return "micro";
  if (d <= 30) return "compact";
  if (d <= 45) return "short";
  if (d <= 60) return "medium";
  return "full";
}

/**
 * When the rendered block is shorter than ideal (stacked neighbours), drop detail tier
 * so text still fits (professional density at all sizes).
 */
export function adminCalendarEffectiveSlotTier(
  durationMinutes: number,
  renderedHeightPx?: number | null
): AdminCalendarSlotTier {
  const base = adminCalendarSlotTier(durationMinutes);
  const h = renderedHeightPx;
  if (h == null || !Number.isFinite(h)) return base;
  if (h < 24) return "micro";
  if (h < 34) {
    return base === "micro" ? "micro" : "compact";
  }
  if (h < 46) {
    if (base === "micro" || base === "compact") return base;
    return "short";
  }
  if (h < 62) {
    if (base === "micro" || base === "compact" || base === "short") return base;
    return "medium";
  }
  if (h < 78 && base === "full") return "medium";
  return base;
}

/** Minimum block height when not using overlay-measured height (legacy / drag overlay). */
export function adminCalendarMinDisplayHeightForTier(tier: AdminCalendarSlotTier): number {
  switch (tier) {
    case "micro":
      return 24;
    case "compact":
      return 40;
    case "short":
      return 54;
    case "medium":
      return 66;
    case "full":
      return 78;
  }
}
