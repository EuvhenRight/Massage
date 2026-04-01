/** Booking draft storage key prefix */
const STORAGE_PREFIX = 'booking-draft-'
const TTL_MS = 60 * 60 * 1000 // 1 hour

export type DraftBookingGranularity = "time" | "day" | "tbd";

export interface BookingDraft {
  step: number
  service: string
  date: string | null
  time: string | null
  durationMinutes: number
  /** Omit = time (legacy drafts) */
  bookingGranularity?: DraftBookingGranularity;
  bookingDayCount?: number;
  scheduleTbdCustomerMessage?: string;
  scheduleTbdAdminHint?: string;
  fullName: string
  email: string
  phone: string
  savedAt: number
}

function storageKey(place: string): string {
  return `${STORAGE_PREFIX}${place}`
}

export function loadBookingDraft(place: string): BookingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(place))
    if (!raw) return null
    const draft = JSON.parse(raw) as BookingDraft
    const age = Date.now() - (draft.savedAt ?? 0)
    if (age > TTL_MS) {
      localStorage.removeItem(storageKey(place))
      return null
    }
    return draft
  } catch {
    return null
  }
}

export interface BookingDraftInput {
  step: number
  service: string
  date: Date | string | null
  time: string | null
  durationMinutes: number
  bookingGranularity?: DraftBookingGranularity
  bookingDayCount?: number
  scheduleTbdCustomerMessage?: string
  scheduleTbdAdminHint?: string
  fullName: string
  email: string
  phone: string
}

export function saveBookingDraft(place: string, state: BookingDraftInput): void {
  if (typeof window === 'undefined') return
  try {
    const draft: BookingDraft = {
      ...state,
      date: state.date ? new Date(state.date).toISOString() : null,
      bookingGranularity: state.bookingGranularity,
      bookingDayCount: state.bookingDayCount,
      scheduleTbdCustomerMessage: state.scheduleTbdCustomerMessage,
      scheduleTbdAdminHint: state.scheduleTbdAdminHint,
      savedAt: Date.now(),
    }
    localStorage.setItem(storageKey(place), JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function parseDraftToState(draft: BookingDraft): {
  step: number
  service: string
  date: Date | null
  time: string | null
  durationMinutes: number
  bookingGranularity: DraftBookingGranularity
  bookingDayCount: number
  scheduleTbdCustomerMessage: string
  scheduleTbdAdminHint: string
  fullName: string
  email: string
  phone: string
} {
  const granTbd =
    draft.bookingGranularity === "day" || draft.bookingGranularity === "tbd"
  return {
    step: draft.step,
    service: draft.service,
    date: granTbd ? null : draft.date ? new Date(draft.date) : null,
    time: granTbd ? null : draft.time,
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
  }
}

export function clearBookingDraft(place: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(place))
  } catch {
    // ignore
  }
}
