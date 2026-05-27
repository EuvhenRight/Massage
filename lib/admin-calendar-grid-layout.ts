/** Admin week/day calendar: one hour row height (4 × 15-min cells).
 *  112px = "comfortable" Google-Calendar-like density (28px per 15-min quarter). */
export const ADMIN_CALENDAR_HOUR_ROW_PX = 112;
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

export interface ColumnLayoutInput {
  id: string;
  startMs: number;
  durationMinutes: number;
}

/** Position of one timed event when concurrent bookings are split into columns. */
export interface PositionedColumn {
  topPx: number;
  heightPx: number;
  /** 0–100, percentage of the day column. */
  leftPct: number;
  widthPct: number;
  zIndex: number;
}

/**
 * Google-Calendar-style column packing for a single day's timed events.
 *
 * Transitively overlapping events form a cluster; within a cluster each event
 * is greedily placed in the first column that is free at its start, then
 * expanded rightward across any columns that stay free for its whole duration.
 * The result lets concurrent bookings sit side-by-side at full height instead
 * of stacking/clipping, so dense days stay readable.
 */
export function computeTimedColumnLayout(
  events: ColumnLayoutInput[],
  gridStartHour: number,
  _gridEndHour: number,
  opts: { minHeightPx?: number } = {}
): Map<string, PositionedColumn> {
  const minHeightPx = opts.minHeightPx ?? 18;
  const out = new Map<string, PositionedColumn>();
  if (events.length === 0) return out;

  type E = {
    id: string;
    startMs: number;
    endMs: number;
    col: number;
    topPx: number;
    heightPx: number;
  };
  const items: E[] = events.map((e) => {
    const start = new Date(e.startMs);
    return {
      id: e.id,
      startMs: e.startMs,
      endMs: e.startMs + Math.max(1, e.durationMinutes) * 60000,
      col: 0,
      topPx: adminAppointmentTopPxFromStart(start, gridStartHour),
      heightPx: adminAppointmentDurationHeightPx(e.durationMinutes, minHeightPx),
    };
  });
  // Earliest first; longer events first so they take the leftmost columns.
  items.sort((a, b) => a.startMs - b.startMs || b.endMs - a.endMs);

  const timeOverlap = (a: E, b: E) => a.startMs < b.endMs && b.startMs < a.endMs;

  let i = 0;
  while (i < items.length) {
    // Gather a cluster of transitively overlapping events.
    const group: E[] = [items[i]];
    let groupEnd = items[i].endMs;
    let j = i + 1;
    while (j < items.length && items[j].startMs < groupEnd) {
      group.push(items[j]);
      groupEnd = Math.max(groupEnd, items[j].endMs);
      j++;
    }

    // Greedy column assignment: first column whose last event already ended.
    const colEnds: number[] = [];
    for (const ev of group) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= ev.startMs) {
          ev.col = c;
          colEnds[c] = ev.endMs;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = colEnds.length;
        colEnds.push(ev.endMs);
      }
    }
    const numCols = colEnds.length;

    for (const ev of group) {
      // Expand rightward over columns that stay free for this event's duration.
      let span = 1;
      for (let c = ev.col + 1; c < numCols; c++) {
        const collides = group.some(
          (o) => o !== ev && o.col === c && timeOverlap(o, ev)
        );
        if (collides) break;
        span++;
      }
      out.set(ev.id, {
        topPx: ev.topPx,
        heightPx: ev.heightPx,
        leftPct: (ev.col / numCols) * 100,
        widthPct: (span / numCols) * 100,
        zIndex: 10 + ev.col,
      });
    }
    i = j;
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
