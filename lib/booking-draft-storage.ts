import { getDateKey } from "./booking";
import {
  bookingItemsFromFirestore,
  bookingItemToFirestore,
  isTbdCart,
  normalizeItemDurationMinutes,
  type BookingItem,
} from "./booking-items";

/** Booking draft storage key prefix */
const STORAGE_PREFIX = "booking-draft-";
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Bump when on-disk shape or rules change so we can invalidate bad drafts. */
export const BOOKING_DRAFT_FORMAT_VERSION = 5;

const MAX_BOOKING_DURATION_MINUTES = 24 * 60;

export type DraftBookingGranularity = "time" | "day" | "tbd";

export interface BookingDraft {
  /** Format version; v2+ uses dateKey and stricter validation */
  v?: number;
  step: number;
  /**
   * v5+: the cart. Older drafts carry a single `service` string, which
   * {@link sanitizeBookingDraft} folds into a one-element array.
   */
  items?: Record<string, unknown>[];
  /** Denormalized join of item titles — still written so v4 readers degrade gracefully. */
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
  /** v3+: customer notification preferences (default true when missing). */
  notifyByEmail?: boolean;
  notifyByWhatsApp?: boolean;
  /** v4+: optional birthday (YYYY-MM-DD) for greetings, and marketing opt-in (GDPR). */
  birthday?: string;
  optInMarketing?: boolean;
  /** Price-catalog woman/man branch (optional). */
  catalogSex?: "woman" | "man" | null;
  savedAt: number;
}

/**
 * Read the cart out of a draft. Pre-v5 drafts have no `items`, so the single
 * `service` string is promoted to one line — an in-progress booking made before
 * the upgrade keeps working instead of being silently dropped.
 */
export function draftItems(draft: BookingDraft): BookingItem[] {
  const parsed = bookingItemsFromFirestore(draft.items);
  if (parsed.length > 0) return parsed;
  const title = typeof draft.service === "string" ? draft.service.trim() : "";
  if (!title) return [];
  const tbd =
    draft.bookingGranularity === "day" || draft.bookingGranularity === "tbd";
  return [
    {
      key: title,
      title,
      durationMinutes: normalizeItemDurationMinutes(draft.durationMinutes),
      granularity: tbd ? "tbd" : "time",
      bookingDayCount: tbd
        ? Math.min(14, Math.max(1, Math.floor(Number(draft.bookingDayCount)) || 1))
        : undefined,
      scheduleTbdCustomerMessage: tbd
        ? (draft.scheduleTbdCustomerMessage ?? "")
        : undefined,
      scheduleTbdAdminHint: tbd ? (draft.scheduleTbdAdminHint ?? "") : undefined,
    },
  ];
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

  if (draft.catalogSex === "woman" || draft.catalogSex === "man") {
    out.catalogSex = draft.catalogSex;
  } else {
    out.catalogSex = null;
  }

  // Re-derive every service-shaped field from the cart so a hand-edited or
  // half-migrated draft can never disagree with itself.
  const items = draftItems(draft);
  out.items = items.map(bookingItemToFirestore);
  out.service = items.map((i) => i.title).join(" + ");
  const granTbd = isTbdCart(items);
  out.bookingGranularity = granTbd ? "tbd" : "time";
  out.bookingDayCount = granTbd ? (items[0]?.bookingDayCount ?? 1) : 1;
  out.scheduleTbdCustomerMessage = granTbd
    ? (items[0]?.scheduleTbdCustomerMessage ?? "")
    : "";
  out.scheduleTbdAdminHint = granTbd
    ? (items[0]?.scheduleTbdAdminHint ?? "")
    : "";

  const dur = items.reduce(
    (acc, i) => acc + normalizeItemDurationMinutes(i.durationMinutes),
    0
  );
  out.durationMinutes = items.length
    ? Math.min(dur, MAX_BOOKING_DURATION_MINUTES)
    : 60;

  // An empty cart cannot support a date/time or a confirmation screen.
  if (items.length === 0) out.step = 1;

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

  out.notifyByEmail =
    typeof draft.notifyByEmail === "boolean" ? draft.notifyByEmail : true;
  out.notifyByWhatsApp =
    typeof draft.notifyByWhatsApp === "boolean" ? draft.notifyByWhatsApp : true;
  if (!out.notifyByEmail && !out.notifyByWhatsApp) {
    out.notifyByEmail = true;
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
  items: BookingItem[];
  date: Date | string | null;
  time: string | null;
  fullName: string;
  email: string;
  phone: string;
  notifyByEmail?: boolean;
  notifyByWhatsApp?: boolean;
  birthday?: string;
  optInMarketing?: boolean;
  catalogSex?: "woman" | "man" | null;
}

export function saveBookingDraft(place: string, state: BookingDraftInput): void {
  if (typeof window === "undefined") return;
  try {
    const cal = state.date ? new Date(state.date) : null;
    const dateKey = cal && !Number.isNaN(cal.getTime()) ? getDateKey(cal) : null;
    const items = state.items ?? [];
    const tbd = isTbdCart(items);
    const draft: BookingDraft = {
      v: BOOKING_DRAFT_FORMAT_VERSION,
      step: state.step,
      items: items.map(bookingItemToFirestore),
      // Denormalized mirrors: a v4 reader (an older tab still open on the same
      // device) can still show something sensible instead of an empty booking.
      service: items.map((i) => i.title).join(" + "),
      durationMinutes: items.reduce(
        (acc, i) => acc + normalizeItemDurationMinutes(i.durationMinutes),
        0
      ),
      bookingGranularity: tbd ? "tbd" : "time",
      bookingDayCount: tbd ? (items[0]?.bookingDayCount ?? 1) : 1,
      scheduleTbdCustomerMessage: tbd
        ? (items[0]?.scheduleTbdCustomerMessage ?? "")
        : "",
      scheduleTbdAdminHint: tbd ? (items[0]?.scheduleTbdAdminHint ?? "") : "",
      time: state.time,
      fullName: state.fullName,
      email: state.email,
      phone: state.phone,
      date: cal ? cal.toISOString() : null,
      dateKey,
      catalogSex: state.catalogSex ?? null,
      notifyByEmail: state.notifyByEmail !== false,
      notifyByWhatsApp: state.notifyByWhatsApp !== false,
      birthday:
        typeof state.birthday === "string" && state.birthday.trim()
          ? state.birthday.trim()
          : undefined,
      optInMarketing: state.optInMarketing === true,
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(place), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function parseDraftToState(draft: BookingDraft): {
  step: number;
  items: BookingItem[];
  date: Date | null;
  time: string | null;
  fullName: string;
  email: string;
  phone: string;
  notifyByEmail: boolean;
  notifyByWhatsApp: boolean;
  birthday: string;
  optInMarketing: boolean;
  catalogSex: "woman" | "man" | null;
} {
  const items = draftItems(draft);
  const granTbd = isTbdCart(items);
  const cal = granTbd ? null : calendarDateFromDraft(draft);
  const timeNorm = granTbd ? null : normalizeDraftTime(draft.time);
  let notifyByEmail =
    typeof draft.notifyByEmail === "boolean" ? draft.notifyByEmail : true;
  let notifyByWhatsApp =
    typeof draft.notifyByWhatsApp === "boolean"
      ? draft.notifyByWhatsApp
      : true;
  if (!notifyByEmail && !notifyByWhatsApp) {
    notifyByEmail = true;
  }
  return {
    step: draft.step,
    items,
    date: cal,
    time: timeNorm,
    fullName: draft.fullName,
    email: draft.email,
    phone: draft.phone,
    notifyByEmail,
    notifyByWhatsApp,
    birthday:
      typeof draft.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.birthday)
        ? draft.birthday
        : "",
    optInMarketing: draft.optInMarketing === true,
    catalogSex:
      draft.catalogSex === "woman" || draft.catalogSex === "man"
        ? draft.catalogSex
        : null,
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
