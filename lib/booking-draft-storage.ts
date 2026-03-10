/** Booking draft storage key prefix */
const STORAGE_PREFIX = 'booking-draft-'
const TTL_MS = 60 * 60 * 1000 // 1 hour

export interface BookingDraft {
  step: number
  service: string
  date: string | null
  time: string | null
  durationMinutes: number
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
  fullName: string
  email: string
  phone: string
} {
  return {
    step: draft.step,
    service: draft.service,
    date: draft.date ? new Date(draft.date) : null,
    time: draft.time,
    durationMinutes: draft.durationMinutes,
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
