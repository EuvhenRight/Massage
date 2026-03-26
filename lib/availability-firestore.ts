import { Timestamp } from "firebase/firestore";
import type { ScheduleData } from "./schedule-firestore";
import { getDateKey } from "./booking";

export const SLOT_INTERVAL = 15; // 15-min slots: 13:00, 13:15, 13:30, 13:45 — 4 per hour

/** Default prep buffer when not set in schedule. */
export const PREP_BUFFER_MINUTES = 15;

export function getPrepBufferMinutes(schedule: ScheduleData | null | undefined): number {
  const v = schedule?.prepBufferMinutes;
  return typeof v === "number" && v >= 0 ? v : PREP_BUFFER_MINUTES;
}

export interface OccupiedSlot {
  start: Date;
  end: Date;
}

/**
 * Parse appointment data into occupied time ranges.
 * Each range includes prepBufferMinutes after the appointment end.
 */
export function parseOccupiedSlots(
  appointments: { startTime: Timestamp | Date; endTime: Timestamp | Date }[],
  prepBufferMinutes: number = PREP_BUFFER_MINUTES
): OccupiedSlot[] {
  return appointments.map((apt) => {
    const start =
      apt.startTime && typeof apt.startTime === "object" && "toDate" in apt.startTime
        ? (apt.startTime as Timestamp).toDate()
        : new Date(apt.startTime as Date);
    const end =
      apt.endTime && typeof apt.endTime === "object" && "toDate" in apt.endTime
        ? (apt.endTime as Timestamp).toDate()
        : new Date(apt.endTime as Date);
    const endWithBuffer = new Date(end.getTime() + prepBufferMinutes * 60 * 1000);
    return { start, end: endWithBuffer };
  });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Generate slot times between open and close (HH:mm), 30-min intervals.
 */
function getSlotTimesInRange(open: string, close: string): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(open);
  const end = timeToMinutes(close);
  while (current + SLOT_INTERVAL <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += SLOT_INTERVAL;
  }
  return slots;
}

/**
 * Check if a slot (HH:mm) overlaps with any occupied range on the given date.
 */
function slotOverlaps(
  date: Date,
  slotTime: string,
  durationMinutes: number,
  occupied: OccupiedSlot[]
): boolean {
  const slotStart = new Date(date);
  const [h, m] = slotTime.split(":").map(Number);
  slotStart.setHours(h, m, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

  const dateStr = getDateKey(date);
  for (const { start, end } of occupied) {
    if (getDateKey(start) !== dateStr) continue;
    if (start < slotEnd && end > slotStart) return true;
  }
  return false;
}

/**
 * Get working hours for a date from schedule. Returns null if closed.
 * Checks date overrides first (YYYY-MM-DD), then month overrides (YYYY-MM), then default weekly schedule.
 */
export function getWorkingHoursForDate(
  schedule: ScheduleData | null,
  date: Date
): { open: string; close: string } | null {
  if (!schedule) return { open: "08:00", close: "20:00" };
  const dateKey = getDateKey(date);
  const dateOverride = schedule.dateOverrides?.[dateKey];
  if (dateOverride !== undefined) return dateOverride;
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const dayOfWeek = date.getDay();
  const monthSchedule = schedule.monthOverrides?.[monthKey];
  const daySchedule = monthSchedule
    ? monthSchedule[dayOfWeek]
    : schedule.defaultSchedule[dayOfWeek];
  return daySchedule ?? null;
}

/**
 * Get available time slots for a date, given occupied ranges and optional schedule.
 * Past slots for today are excluded.
 */
export function getAvailableTimeSlots(
  date: Date,
  durationMinutes: number,
  occupied: OccupiedSlot[],
  schedule?: ScheduleData | null
): string[] {
  const daySchedule = getWorkingHoursForDate(schedule ?? null, date);
  if (!daySchedule) return [];

  const allSlots = getSlotTimesInRange(daySchedule.open, daySchedule.close);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slotDate = new Date(date);
  slotDate.setHours(0, 0, 0, 0);
  if (slotDate.getTime() < today.getTime()) return [];
  const isToday = slotDate.getTime() === today.getTime();

  return allSlots.filter((slot) => {
    if (slotOverlaps(date, slot, durationMinutes, occupied)) return false;
    if (isToday) {
      const [h, m] = slot.split(":").map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      if (slotEnd.getTime() <= Date.now()) return false;
    }
    return true;
  });
}

/**
 * Check if a date has any available slots.
 */
export function isDateAvailable(
  date: Date,
  durationMinutes: number,
  occupied: OccupiedSlot[],
  schedule?: ScheduleData | null
): boolean {
  return getAvailableTimeSlots(date, durationMinutes, occupied, schedule).length > 0;
}

/**
 * Start time (HH:mm) and duration for a booking that spans the full working window on that date.
 */
export function getDayBookingSlot(
  date: Date,
  schedule: ScheduleData | null
): { startTime: string; durationMinutes: number } | null {
  const wh = getWorkingHoursForDate(schedule, date);
  if (!wh) return null;
  const openM = timeToMinutes(wh.open);
  const closeM = timeToMinutes(wh.close);
  if (closeM <= openM) return null;
  return { startTime: wh.open, durationMinutes: closeM - openM };
}

/**
 * True if the full working interval [open, close] is free (no overlap with occupied ranges on that calendar day).
 */
export function isWorkingDayWindowAvailable(
  date: Date,
  occupied: OccupiedSlot[],
  schedule: ScheduleData | null
): boolean {
  const wh = getWorkingHoursForDate(schedule, date);
  if (!wh) return false;
  const openM = timeToMinutes(wh.open);
  const closeM = timeToMinutes(wh.close);
  if (closeM <= openM) return false;

  const windowStart = new Date(date);
  windowStart.setHours(Math.floor(openM / 60), openM % 60, 0, 0);
  const windowEnd = new Date(date);
  windowEnd.setHours(Math.floor(closeM / 60), closeM % 60, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slotDate = new Date(date);
  slotDate.setHours(0, 0, 0, 0);
  if (slotDate.getTime() < today.getTime()) return false;
  if (slotDate.getTime() === today.getTime() && windowEnd.getTime() <= Date.now()) return false;

  const dateStr = getDateKey(date);
  for (const { start, end } of occupied) {
    if (getDateKey(start) !== dateStr) continue;
    if (start < windowEnd && end > windowStart) return false;
  }
  return true;
}

/**
 * True if each of `dayCount` consecutive calendar days starting at `startDate` has a free full working window.
 */
export function isMultiDayFullDaysStartAvailable(
  startDate: Date,
  dayCount: number,
  occupied: OccupiedSlot[],
  schedule: ScheduleData | null
): boolean {
  const n = Math.max(1, Math.floor(dayCount));
  for (let i = 0; i < n; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (!isWorkingDayWindowAvailable(d, occupied, schedule)) return false;
  }
  return true;
}
