import { getDateKey } from "./booking";

/** Booking draft storage key prefix */
const STORAGE_PREFIX = "booking-draft-";
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Bump when on-disk shape or rules change so we can invalidate bad drafts. */
export const BOOKING_DRAFT_FORMAT_VERSION = 2;

const MAX_BOOKING_DURATION_MINUTES = 24 * 60;

export type DraftBookingGranularity = "time" | "day" | "tbd";

export interface BookingDraft {
  /** Format version; v2+ uses dateKey and stricter validation */
  v?: number;
  step: number;
  service: string;
  date: string | null;
  /** Local calendar YYYY-MM-DD — stable across timezones (preferred over legacy ISO `date`) */
  dateKey?: string | null;
  time: string | null;
  durationMinutes: number;
  /** Omit = time (legacy drafts) */
  bookingGranularity?: DraftBookingGranularity;
  bookingDayCount?: number;
  scheduleTbdCustomerMessage?: string;
  scheduleTbdAdminHint?: string;
  fullName: string;
  email: string;
  phone: string;
  savedAt: number;
}

function storageKey(place: string): string {
  return `${STORAGE_PREFIX}${place}`;
}

function normalizeDraftTime(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function startOfTodayLocal(): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

function parseLocalDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, mo, d] = dateKey.split("-").map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** Resolve calendar date from draft (dateKey wins over legacy ISO). */
export function calendarDateFromDraft(draft: BookingDraft): Date | null {
  if (draft.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(draft.dateKey)) {
    return parseLocalDateKey(draft.dateKey);
  }
  if (draft.date) {
    const d = new Date(draft.date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Fix drafts that would strand the user (past date, bad step, junk time).
 * Prevents needing “clear site data” to book again.
 */
function sanitizeBookingDraft(draft: BookingDraft): BookingDraft {
  const out: BookingDraft = { ...draft, v: BOOKING_DRAFT_FORMAT_VERSION };

  let step = Math.floor(Number(draft.step));
  if (!Number.isFinite(step) || step < 1 || step > 4) step = 1;
  out.step = step;

  let dur = Math.floor(Number(draft.durationMinutes));
  if (!Number.isFinite(dur) || dur < 15) dur = 60;
  out.durationMinutes = Math.min(dur, MAX_BOOKING_DURATION_MINUTES);

  const granTbd =
    draft.bookingGranularity === "day" || draft.bookingGranularity === "tbd";

  let dateKey =
    draft.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(draft.dateKey)
      ? draft.dateKey
      : null;
  if (!dateKey && draft.date) {
    const cal = new Date(draft.date);
    if (!Number.isNaN(cal.getTime())) {
      dateKey = getDateKey(cal);
    }
  }

  if (!granTbd) {
    const cal = dateKey ? parseLocalDateKey(dateKey) : calendarDateFromDraft({ ...draft, dateKey });
    let dateInPast = false;
    if (cal) {
      const d0 = new Date(cal);
      d0.setHours(0, 0, 0, 0);
      if (d0.getTime() < startOfTodayLocal()) {
        dateKey = null;
        dateInPast = true;
        out.step = Math.min(out.step, 2);
      }
    }
    out.time = dateInPast ? null : normalizeDraftTime(draft.time);
    if (!out.time) {
      out.step = Math.min(out.step, 2);
    }
    out.dateKey = dateKey;
    if (dateKey) {
      const anchor = parseLocalDateKey(dateKey);
      if (anchor) out.date = anchor.toISOString();
    } else {
      out.date = null;
    }

    if (out.step >= 3 && (!out.dateKey || !out.time)) {
      out.step = 2;
    }
  } else {
    out.dateKey = null;
    out.date = null;
    out.time = null;
  }

  return out;
}

export function loadBookingDraft(place: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(place));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    const age = Date.now() - (parsed.savedAt ?? 0);
    if (age > TTL_MS) {
      localStorage.removeItem(storageKey(place));
      return null;
    }
    const draft = sanitizeBookingDraft(parsed);
    if ((parsed.v ?? 0) < BOOKING_DRAFT_FORMAT_VERSION) {
      try {
        localStorage.setItem(storageKey(place), JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }
    return draft;
  } catch {
    try {
      localStorage.removeItem(storageKey(place));
    } catch {
      /* ignore */
    }
    return null;
  }
}

export interface BookingDraftInput {
  step: number;
  service: string;
  date: Date | string | null;
  time: string | null;
  durationMinutes: number;
  bookingGranularity?: DraftBookingGranularity;
  bookingDayCount?: number;
  scheduleTbdCustomerMessage?: string;
  scheduleTbdAdminHint?: string;
  fullName: string;
  email: string;
  phone: string;
}

export function saveBookingDraft(place: string, state: BookingDraftInput): void {
  if (typeof window === "undefined") return;
  try {
    const cal = state.date ? new Date(state.date) : null;
    const dateKey = cal && !Number.isNaN(cal.getTime()) ? getDateKey(cal) : null;
    const draft: BookingDraft = {
      v: BOOKING_DRAFT_FORMAT_VERSION,
      ...state,
      date: cal ? cal.toISOString() : null,
      dateKey,
      bookingGranularity: state.bookingGranularity,
      bookingDayCount: state.bookingDayCount,
      scheduleTbdCustomerMessage: state.scheduleTbdCustomerMessage,
      scheduleTbdAdminHint: state.scheduleTbdAdminHint,
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(place), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function parseDraftToState(draft: BookingDraft): {
  step: number;
  service: string;
  date: Date | null;
  time: string | null;
  durationMinutes: number;
  bookingGranularity: DraftBookingGranularity;
  bookingDayCount: number;
  scheduleTbdCustomerMessage: string;
  scheduleTbdAdminHint: string;
  fullName: string;
  email: string;
  phone: string;
} {
  const granTbd =
    draft.bookingGranularity === "day" || draft.bookingGranularity === "tbd";
  const cal = granTbd ? null : calendarDateFromDraft(draft);
  const timeNorm = granTbd ? null : normalizeDraftTime(draft.time);
  return {
    step: draft.step,
    service: draft.service,
    date: cal,
    time: timeNorm,
    durationMinutes: draft.durationMinutes,
    bookingGranularity: granTbd ? "tbd" : "time",
    bookingDayCount:
      typeof draft.bookingDayCount === "number" && draft.bookingDayCount >= 1
        ? Math.min(14, draft.bookingDayCount)
        : 1,
    scheduleTbdCustomerMessage:
      typeof draft.scheduleTbdCustomerMessage === "string"
        ? draft.scheduleTbdCustomerMessage
        : "",
    scheduleTbdAdminHint:
      typeof draft.scheduleTbdAdminHint === "string"
        ? draft.scheduleTbdAdminHint
        : "",
    fullName: draft.fullName,
    email: draft.email,
    phone: draft.phone,
  };
}

export function clearBookingDraft(place: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(place));
  } catch {
    // ignore
  }
}
