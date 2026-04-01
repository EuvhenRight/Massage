import { doc, getDoc, setDoc } from "firebase/firestore";
import { timeToMinutes } from "./booking";
import { db } from "./firebase";
import type { Place } from "./places";

export type DayScheduleMode = "window" | "slotBegins" | "allDay";

/** One day: fixed hours, reusable begin-only times, or all-day availability. */
export type DaySchedule =
  | null
  | {
      mode: DayScheduleMode;
      open?: string;
      close?: string;
      /** mode slotBegins: allowed start times (HH:mm), same list every week for this weekday. */
      slotBegins?: string[];
    };

function normalizeHm(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeCloseHm(raw: string): string | null {
  const t = raw.trim();
  if (t === "24:00") return "24:00";
  return normalizeHm(t);
}

/**
 * Parse Firestore / JSON into a normalized day schedule.
 * Legacy `{ open, close }` without `mode` becomes `mode: window`.
 */
export function parseDaySchedule(v: unknown): DaySchedule {
  if (v === null) return null;
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (o.mode === "allDay") {
    return { mode: "allDay" };
  }
  const modeRaw = o.mode;
  const openRaw = typeof o.open === "string" ? normalizeHm(o.open) : undefined;
  const closeRaw = typeof o.close === "string" ? normalizeCloseHm(o.close) : undefined;
  let slotBegins: string[] | undefined;
  if (Array.isArray(o.slotBegins)) {
    const xs = o.slotBegins
      .filter((x): x is string => typeof x === "string")
      .map((x) => normalizeHm(x))
      .filter((x): x is string => x !== null);
    slotBegins = Array.from(new Set(xs)).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    if (slotBegins.length === 0) slotBegins = undefined;
  }
  const wantsSlots =
    modeRaw === "slotBegins" || (slotBegins !== undefined && slotBegins.length > 0);
  if (wantsSlots) {
    const begins = slotBegins ?? [];
    if (begins.length === 0) return null;
    return {
      mode: "slotBegins",
      slotBegins: begins,
      close: closeRaw ?? "18:00",
      ...(openRaw ? { open: openRaw } : {}),
    };
  }
  if (openRaw && closeRaw) {
    return { mode: "window", open: openRaw, close: closeRaw };
  }
  return null;
}

/** Key: "YYYY-MM" (e.g. "2025-03"), value: weekly schedule for that month */
export type MonthOverrides = Record<string, Record<number, DaySchedule>>;

/** Key: "YYYY-MM-DD", value: schedule for that specific date (null = closed) */
export type DateOverrides = Record<string, DaySchedule | null>;

export interface ScheduleData {
  defaultSchedule: Record<number, DaySchedule>; // 0=Sun .. 6=Sat
  slotDurationMinutes: number;
  /** Minutes reserved after each appointment for preparation. Default 15. */
  prepBufferMinutes?: number;
  /** Per-month overrides. If set for a month, used instead of default. */
  monthOverrides?: MonthOverrides;
  /** Per-date overrides. Takes precedence over month/week schedule. */
  dateOverrides?: DateOverrides;
}

const DEFAULT_SCHEDULE: ScheduleData = {
  defaultSchedule: {
    0: null,
    1: { mode: "window", open: "09:00", close: "18:00" },
    2: { mode: "window", open: "09:00", close: "18:00" },
    3: { mode: "window", open: "09:00", close: "18:00" },
    4: { mode: "window", open: "09:00", close: "18:00" },
    5: { mode: "window", open: "09:00", close: "18:00" },
    6: { mode: "window", open: "10:00", close: "16:00" },
  },
  slotDurationMinutes: 30,
  prepBufferMinutes: 15,
};

export async function getSchedule(place: Place = "massage"): Promise<ScheduleData> {
  let ref = doc(db, "schedule", place);
  let snap = await getDoc(ref);
  if (!snap.exists() && place === "massage") {
    ref = doc(db, "schedule", "default");
    snap = await getDoc(ref);
  }
  if (!snap.exists()) return DEFAULT_SCHEDULE;
  const d = snap.data();
  const defaultSchedule: Record<number, DaySchedule> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  for (let i = 0; i <= 6; i++) {
    const v = d.defaultSchedule?.[i];
    defaultSchedule[i] =
      v === null ? null : parseDaySchedule(v) ?? DEFAULT_SCHEDULE.defaultSchedule[i];
  }
  const monthOverrides: MonthOverrides = {};
  const raw = d.monthOverrides as Record<string, Record<number, DaySchedule>> | undefined;
  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val !== "object" || val === null) continue;
      const parsed: Record<number, DaySchedule> = {};
      for (let i = 0; i <= 6; i++) {
        const v = val[i];
        parsed[i] = v === null ? null : parseDaySchedule(v);
      }
      monthOverrides[key] = parsed;
    }
  }
  const dateOverrides: DateOverrides = {};
  const rawDates = d.dateOverrides as Record<string, DaySchedule | null> | undefined;
  if (rawDates && typeof rawDates === "object") {
    for (const [key, val] of Object.entries(rawDates)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      dateOverrides[key] = val === null ? null : parseDaySchedule(val);
    }
  }
  const prepBufferMinutes =
    typeof d.prepBufferMinutes === "number" && d.prepBufferMinutes >= 0 ? d.prepBufferMinutes : 15;

  return {
    defaultSchedule,
    slotDurationMinutes: typeof d.slotDurationMinutes === "number" ? d.slotDurationMinutes : 30,
    prepBufferMinutes,
    monthOverrides: Object.keys(monthOverrides).length > 0 ? monthOverrides : undefined,
    dateOverrides: Object.keys(dateOverrides).length > 0 ? dateOverrides : undefined,
  };
}

/** Build Firestore-safe payload (no undefined, numeric keys as strings for nested maps) */
function toFirestorePayload(data: ScheduleData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    defaultSchedule: data.defaultSchedule,
    slotDurationMinutes: data.slotDurationMinutes,
    prepBufferMinutes: data.prepBufferMinutes ?? 15,
  };
  if (data.monthOverrides && Object.keys(data.monthOverrides).length > 0) {
    payload.monthOverrides = data.monthOverrides;
  }
  if (data.dateOverrides && Object.keys(data.dateOverrides).length > 0) {
    payload.dateOverrides = data.dateOverrides;
  }
  return payload;
}

export async function saveSchedule(data: ScheduleData, place: Place = "massage"): Promise<void> {
  await setDoc(doc(db, "schedule", place), toFirestorePayload(data));
}
