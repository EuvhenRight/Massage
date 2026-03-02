import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Place } from "./places";

export type DaySchedule = { open: string; close: string } | null;

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
    1: { open: "09:00", close: "18:00" },
    2: { open: "09:00", close: "18:00" },
    3: { open: "09:00", close: "18:00" },
    4: { open: "09:00", close: "18:00" },
    5: { open: "09:00", close: "18:00" },
    6: { open: "10:00", close: "16:00" },
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
    defaultSchedule[i] = v === null || (v && typeof v.open === "string" && typeof v.close === "string")
      ? (v as DaySchedule)
      : DEFAULT_SCHEDULE.defaultSchedule[i];
  }
  const monthOverrides: MonthOverrides = {};
  const raw = d.monthOverrides as Record<string, Record<number, DaySchedule>> | undefined;
  if (raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val !== "object" || val === null) continue;
      const parsed: Record<number, DaySchedule> = {};
      for (let i = 0; i <= 6; i++) {
        const v = val[i];
        parsed[i] = v === null || (v && typeof v.open === "string" && typeof v.close === "string")
          ? (v as DaySchedule)
          : null;
      }
      monthOverrides[key] = parsed;
    }
  }
  const dateOverrides: DateOverrides = {};
  const rawDates = d.dateOverrides as Record<string, DaySchedule | null> | undefined;
  if (rawDates && typeof rawDates === "object") {
    for (const [key, val] of Object.entries(rawDates)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      dateOverrides[key] =
        val === null || (val && typeof val.open === "string" && typeof val.close === "string")
          ? val
          : null;
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

export async function saveSchedule(data: ScheduleData, place: Place = "massage"): Promise<void> {
  await setDoc(doc(db, "schedule", place), data);
}
