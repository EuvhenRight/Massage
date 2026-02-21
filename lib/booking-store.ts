import type { Schedule, Appointment } from "./booking";
import {
  DEFAULT_SCHEDULE,
  getScheduleForDate,
  generateTimeSlots,
  getDateKey,
  timeToMinutes,
} from "./booking";

// In-memory store (replace with DB in production)
let schedule: Schedule = { ...DEFAULT_SCHEDULE };
const appointments: Map<string, Appointment> = new Map();

export function getSchedule(): Schedule {
  return JSON.parse(JSON.stringify(schedule));
}

export function setSchedule(s: Partial<Schedule>): Schedule {
  if (s.defaultSchedule)
    schedule.defaultSchedule = { ...schedule.defaultSchedule, ...s.defaultSchedule };
  if (s.slotDurationMinutes !== undefined)
    schedule.slotDurationMinutes = s.slotDurationMinutes;
  if (s.overrides !== undefined)
    schedule.overrides = { ...schedule.overrides, ...s.overrides };
  return getSchedule();
}

export function setDateOverride(date: string, override: { open: string; close: string } | null): void {
  if (override) {
    schedule.overrides[date] = override;
  } else {
    delete schedule.overrides[date];
  }
}

export function getAppointments(date?: string): Appointment[] {
  const list = Array.from(appointments.values());
  if (date) return list.filter((a) => a.date === date);
  return list.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function createAppointment(data: Omit<Appointment, "id" | "createdAt">): Appointment | null {
  const date = new Date(data.date + "T12:00:00");
  const available = getAvailableSlots(date);
  if (!available.includes(data.time)) return null;
  const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const apt: Appointment = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  appointments.set(id, apt);
  return apt;
}

export function getAvailableSlots(date: Date): string[] {
  const daySchedule = getScheduleForDate(schedule, date);
  if (!daySchedule) return [];

  const dateStr = getDateKey(date);
  const existing = getAppointments(dateStr);
  const bookedMinutes = new Set<number>();
  for (const a of existing) {
    const start = timeToMinutes(a.time);
    for (let i = 0; i < a.durationMinutes; i += schedule.slotDurationMinutes) {
      bookedMinutes.add(start + i);
    }
  }

  const allSlots = generateTimeSlots(
    daySchedule.open,
    daySchedule.close,
    schedule.slotDurationMinutes
  );
  return allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    return !bookedMinutes.has(slotStart);
  });
}
