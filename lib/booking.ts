// Booking types and utilities

export type DaySchedule = { open: string; close: string } | null; // null = closed, times as "HH:mm"
export type WeeklySchedule = Record<number, DaySchedule>; // 0=Sun, 6=Sat
export type DateOverride = { open: string; close: string } | null;

export interface Schedule {
  slotDurationMinutes: number;
  defaultSchedule: WeeklySchedule;
  overrides: Record<string, DateOverride>; // YYYY-MM-DD -> override
}

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  service?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string; // ISO
}

export const DEFAULT_SCHEDULE: Schedule = {
  slotDurationMinutes: 60,
  defaultSchedule: {
    0: null, // Sun closed
    1: { open: "09:00", close: "18:00" }, // Mon
    2: { open: "09:00", close: "18:00" }, // Tue
    3: { open: "09:00", close: "18:00" }, // Wed
    4: { open: "09:00", close: "18:00" }, // Thu
    5: { open: "09:00", close: "18:00" }, // Fri
    6: { open: "10:00", close: "16:00" }, // Sat
  },
  overrides: {},
};

export function getDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

export function timeToMinutes(t: string): number {
  const { h, m } = parseTime(t);
  return h * 60 + m;
}

export function getScheduleForDate(schedule: Schedule, date: Date): DaySchedule {
  const key = getDateKey(date);
  if (schedule.overrides[key] !== undefined) {
    return schedule.overrides[key];
  }
  return schedule.defaultSchedule[date.getDay()] ?? null;
}

export function generateTimeSlots(open: string, close: string, durationMin: number): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(open);
  const end = timeToMinutes(close);
  while (current + durationMin <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += durationMin;
  }
  return slots;
}

export function isDayWorking(schedule: Schedule, date: Date): boolean {
  return getScheduleForDate(schedule, date) !== null;
}
