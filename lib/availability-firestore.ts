import { Timestamp } from "firebase/firestore";

export const SLOT_START_HOUR = 8;
export const SLOT_END_HOUR = 20;
export const SLOT_INTERVAL = 30;

export interface OccupiedSlot {
  start: Date;
  end: Date;
}

/**
 * Parse appointment data into occupied time ranges.
 */
export function parseOccupiedSlots(
  appointments: { startTime: Timestamp | Date; endTime: Timestamp | Date }[]
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
    return { start, end };
  });
}

/**
 * Generate all 30-minute slot start times (HH:mm) for a day.
 */
export function getAllSlotTimes(): string[] {
  const slots: string[] = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
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

  const dateStr = date.toISOString().slice(0, 10);
  for (const { start, end } of occupied) {
    if (start.toISOString().slice(0, 10) !== dateStr) continue;
    if (start < slotEnd && end > slotStart) return true;
  }
  return false;
}

/**
 * Get available time slots for a date, given occupied ranges.
 * Past slots for today are excluded.
 */
export function getAvailableTimeSlots(
  date: Date,
  durationMinutes: number,
  occupied: OccupiedSlot[]
): string[] {
  const allSlots = getAllSlotTimes();
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
  occupied: OccupiedSlot[]
): boolean {
  return getAvailableTimeSlots(date, durationMinutes, occupied).length > 0;
}
