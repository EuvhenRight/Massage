import {
  runTransaction,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Place } from "./places";
import { getDateKey } from "./booking";
import {
  getPrepBufferMinutes,
  getWorkingHoursForDate,
} from "./availability-firestore";
import { getSchedule } from "./schedule-firestore";
import type { ScheduleData } from "./schedule-firestore";

export interface AppointmentData {
  id: string;
  startTime: Timestamp | Date;
  endTime: Timestamp | Date;
  service: string;
  serviceId?: string;
  serviceSk?: string;
  serviceEn?: string;
  serviceRu?: string;
  serviceUk?: string;
  fullName: string;
  email: string;
  phone: string;
  place?: Place;
  createdAt?: Timestamp;
  /** True until admin assigns a real slot on the calendar */
  scheduleTbd?: boolean;
  /** Copied from catalog at booking time (admin hint) */
  scheduleTbdAdminHint?: string;
}

export interface BookingInput {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  service: string;
  fullName: string;
  email: string;
  phone: string;
  serviceId?: string;
  serviceSk?: string;
  serviceEn?: string;
  serviceRu?: string;
  serviceUk?: string;
  /**
   * When >= 2, books this many consecutive full working days from `date` (ignores `durationMinutes`).
   * Omit or 1: single range using `startTime` + `durationMinutes` as today.
   */
  multiDayFullDayCount?: number;
}

/** Placeholder start for TBD bookings — not shown on the week grid; admin assigns a real slot later. */
const TBD_PLACEHOLDER_START = new Date(2099, 0, 1, 9, 0, 0, 0);

export interface ScheduleTbdBookingInput {
  service: string;
  fullName: string;
  email: string;
  phone: string;
  durationMinutes: number;
  serviceId?: string;
  serviceSk?: string;
  serviceEn?: string;
  serviceRu?: string;
  serviceUk?: string;
  scheduleTbdAdminHint?: string;
}

/** Admin can create with all fields optional */
export interface AdminBookingInput {
  date: string;
  startTime: string;
  durationMinutes?: number;
  service?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

/** Admin can update any field */
export interface AdminAppointmentUpdate {
  service?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  startTime?: Date;
  durationMinutes?: number;
}

/**
 * Check if two time ranges overlap.
 * Overlap exists when: (ExistingStart < NewEnd) AND (ExistingEnd > NewStart)
 */
function overlaps(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
): boolean {
  return existingStart < newEnd && existingEnd > newStart;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fullDayWindowForDate(
  dateCalendar: Date,
  schedule: ScheduleData | null
): { start: Date; end: Date } | null {
  const wh = getWorkingHoursForDate(schedule, dateCalendar);
  if (!wh) return null;
  const openM = timeToMinutes(wh.open);
  const closeM = timeToMinutes(wh.close);
  if (closeM <= openM) return null;
  const start = new Date(dateCalendar);
  start.setHours(Math.floor(openM / 60), openM % 60, 0, 0);
  const end = new Date(dateCalendar);
  end.setHours(Math.floor(closeM / 60), closeM % 60, 0, 0);
  return { start, end };
}

async function bookConsecutiveFullWorkingDays(
  input: BookingInput,
  place: Place,
  n: number
): Promise<AppointmentData> {
  const schedule = await getSchedule(place);
  const prepBuffer = getPrepBufferMinutes(schedule);
  const parts = input.date.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) throw new Error("INVALID_DATE");

  const windows: { dayKey: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < n; i++) {
    const cal = new Date(y, mo - 1, d + i);
    const w = fullDayWindowForDate(cal, schedule);
    if (!w) throw new Error("DAY_CLOSED");
    const dateStr = getDateKey(cal);
    windows.push({ dayKey: `${place}_${dateStr}`, ...w });
  }

  const newStart = windows[0].start;
  const newEnd = windows[windows.length - 1].end;

  return runTransaction(db, async (transaction) => {
    const dayRefs = windows.map((w) => doc(db, "days", w.dayKey));
    const snaps = await Promise.all(dayRefs.map((ref) => transaction.get(ref)));

    for (let i = 0; i < windows.length; i++) {
      const { start, end } = windows[i];
      const daySnap = snaps[i];
      const slots: { id: string; start: Timestamp; end: Timestamp }[] =
        (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];
      for (const slot of slots) {
        const existingStart = slot.start.toDate();
        const existingEnd = slot.end.toDate();
        const existingEndWithBuffer = new Date(
          existingEnd.getTime() + prepBuffer * 60 * 1000
        );
        if (overlaps(existingStart, existingEndWithBuffer, start, end)) {
          throw new Error("OVERLAP");
        }
      }
    }

    const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const appointmentRef = doc(db, "appointments", id);

    const baseData: Record<string, unknown> = {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      service: input.service,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      place,
      createdAt: serverTimestamp(),
    };

    if (input.serviceId) baseData.serviceId = input.serviceId;
    if (input.serviceSk) baseData.serviceSk = input.serviceSk;
    if (input.serviceEn) baseData.serviceEn = input.serviceEn;
    if (input.serviceRu) baseData.serviceRu = input.serviceRu;
    if (input.serviceUk) baseData.serviceUk = input.serviceUk;

    transaction.set(appointmentRef, baseData);

    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const daySnap = snaps[i];
      const slots: { id: string; start: Timestamp; end: Timestamp }[] =
        (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];
      transaction.set(
        dayRefs[i],
        {
          slots: [
            ...slots,
            {
              id,
              start: Timestamp.fromDate(w.start),
              end: Timestamp.fromDate(w.end),
            },
          ],
        },
        { merge: true }
      );
    }

    return {
      id,
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      service: input.service,
      serviceId: input.serviceId,
      serviceSk: input.serviceSk,
      serviceEn: input.serviceEn,
      serviceRu: input.serviceRu,
      serviceUk: input.serviceUk,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    } as AppointmentData;
  });
}

export async function bookAppointment(input: BookingInput, place: Place = "massage"): Promise<AppointmentData> {
  const multi = input.multiDayFullDayCount;
  if (typeof multi === "number" && multi >= 2) {
    return bookConsecutiveFullWorkingDays(input, place, multi);
  }

  const dateStr = input.date;
  const [startH, startM] = input.startTime.split(":").map(Number);
  const newStart = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
  const newEnd = new Date(newStart.getTime() + input.durationMinutes * 60 * 1000);
  const dayKey = `${place}_${dateStr}`;
  const schedule = await getSchedule(place);
  const prepBuffer = getPrepBufferMinutes(schedule);

  return runTransaction(db, async (transaction) => {
    const dayRef = doc(db, "days", dayKey);
    const daySnap = await transaction.get(dayRef);
    const slots: { id: string; start: Timestamp; end: Timestamp }[] =
      (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];

    for (const slot of slots) {
      const existingStart = slot.start.toDate();
      const existingEnd = slot.end.toDate();
      const existingEndWithBuffer = new Date(
        existingEnd.getTime() + prepBuffer * 60 * 1000
      );
      if (overlaps(existingStart, existingEndWithBuffer, newStart, newEnd)) {
        throw new Error("OVERLAP");
      }
    }

    const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const appointmentRef = doc(db, "appointments", id);

    const baseData: Record<string, unknown> = {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      service: input.service,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      place,
      createdAt: serverTimestamp(),
    };

    if (input.serviceId) baseData.serviceId = input.serviceId;
    if (input.serviceSk) baseData.serviceSk = input.serviceSk;
    if (input.serviceEn) baseData.serviceEn = input.serviceEn;
    if (input.serviceRu) baseData.serviceRu = input.serviceRu;
    if (input.serviceUk) baseData.serviceUk = input.serviceUk;

    transaction.set(appointmentRef, baseData);

    transaction.set(dayRef, {
      slots: [
        ...slots,
        { id, start: Timestamp.fromDate(newStart), end: Timestamp.fromDate(newEnd) },
      ],
    }, { merge: true });

    return {
      id,
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      service: input.service,
      serviceId: input.serviceId,
      serviceSk: input.serviceSk,
      serviceEn: input.serviceEn,
      serviceRu: input.serviceRu,
      serviceUk: input.serviceUk,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    } as AppointmentData;
  });
}

/**
 * Customer chose “date arranged with you” — no calendar slot yet.
 * Does not write to `days`; appears in admin “unscheduled” list until moved to the grid.
 */
export async function bookScheduleTbdAppointment(
  input: ScheduleTbdBookingInput,
  place: Place = "massage"
): Promise<AppointmentData> {
  const dur = Math.max(15, Math.min(240, input.durationMinutes || 60));
  const newStart = new Date(TBD_PLACEHOLDER_START);
  const newEnd = new Date(newStart.getTime() + dur * 60 * 1000);

  const baseData: Record<string, unknown> = {
    startTime: Timestamp.fromDate(newStart),
    endTime: Timestamp.fromDate(newEnd),
    service: input.service,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    place,
    scheduleTbd: true,
    createdAt: serverTimestamp(),
  };

  if (input.scheduleTbdAdminHint?.trim()) {
    baseData.scheduleTbdAdminHint = input.scheduleTbdAdminHint.trim();
  }
  if (input.serviceId) baseData.serviceId = input.serviceId;
  if (input.serviceSk) baseData.serviceSk = input.serviceSk;
  if (input.serviceEn) baseData.serviceEn = input.serviceEn;
  if (input.serviceRu) baseData.serviceRu = input.serviceRu;
  if (input.serviceUk) baseData.serviceUk = input.serviceUk;

  const ref = await addDoc(collection(db, "appointments"), baseData);

  return {
    id: ref.id,
    startTime: Timestamp.fromDate(newStart),
    endTime: Timestamp.fromDate(newEnd),
    service: input.service,
    serviceId: input.serviceId,
    serviceSk: input.serviceSk,
    serviceEn: input.serviceEn,
    serviceRu: input.serviceRu,
    serviceUk: input.serviceUk,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    place,
    scheduleTbd: true,
    scheduleTbdAdminHint: input.scheduleTbdAdminHint?.trim(),
  } as AppointmentData;
}

export async function updateAppointmentTime(
  appointmentId: string,
  newStart: Date,
  durationMinutes: number
): Promise<void> {
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);
  const newDateStr = getDateKey(newStart);

  const aptSnap = await getDoc(doc(db, "appointments", appointmentId));
  if (!aptSnap.exists()) throw new Error("APPOINTMENT_NOT_FOUND");
  const aptPlace = aptSnap.data()?.place as Place | undefined;
  const place: Place = aptPlace ?? "massage";
  const schedule = await getSchedule(place);
  const prepBuffer = getPrepBufferMinutes(schedule);

  return runTransaction(db, async (transaction) => {
    const appointmentRef = doc(db, "appointments", appointmentId);
    const appointmentSnap = await transaction.get(appointmentRef);

    if (!appointmentSnap.exists()) {
      throw new Error("APPOINTMENT_NOT_FOUND");
    }

    const data = appointmentSnap.data();
    const wasTbd = data.scheduleTbd === true;
    const newDayKey = `${place}_${newDateStr}`;
    const oldStart = (data.startTime as Timestamp).toDate();
    const oldEnd = (data.endTime as Timestamp).toDate();
    const oldDateStr = getDateKey(oldStart);
    const oldDayKey = `${place}_${oldDateStr}`;

    const dayRef = doc(db, "days", newDayKey);
    const oldDayRef = doc(db, "days", oldDayKey);

    // Firestore transactions require all reads before any writes.
    const [daySnap, oldDaySnap] = await Promise.all([
      transaction.get(dayRef),
      !wasTbd && oldDayKey !== newDayKey ? transaction.get(oldDayRef) : Promise.resolve(null),
    ]);
    const slots: { id: string; start: Timestamp; end: Timestamp }[] =
      (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];

    for (const slot of slots) {
      if (slot.id === appointmentId) continue;
      const existingStart = slot.start.toDate();
      const existingEnd = slot.end.toDate();
      const existingEndWithBuffer = new Date(
        existingEnd.getTime() + prepBuffer * 60 * 1000
      );
      if (overlaps(existingStart, existingEndWithBuffer, newStart, newEnd)) {
        throw new Error("OVERLAP");
      }
    }

    transaction.update(appointmentRef, {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      ...(wasTbd ? { scheduleTbd: false } : {}),
    });

    const newSlots = slots.filter((s) => s.id !== appointmentId);
    newSlots.push({
      id: appointmentId,
      start: Timestamp.fromDate(newStart),
      end: Timestamp.fromDate(newEnd),
    });
    transaction.set(dayRef, { slots: newSlots }, { merge: true });

    if (!wasTbd && oldDayKey !== newDayKey && oldDaySnap) {
      const oldSlots: { id: string }[] =
        (oldDaySnap.exists() ? (oldDaySnap.data()?.slots as typeof oldSlots) : null) ?? [];
      const filtered = oldSlots.filter((s: { id: string }) => s.id !== appointmentId);
      transaction.set(oldDayRef, { slots: filtered }, { merge: true });
    }
  });
}

/** Read a single appointment by ID */
export async function getAppointment(appointmentId: string): Promise<AppointmentData | null> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const snap = await getDoc(appointmentRef);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    startTime: (d.startTime as Timestamp) ?? new Date(),
    endTime: (d.endTime as Timestamp) ?? new Date(),
    service: (d.service as string) ?? "",
    serviceId: d.serviceId as string | undefined,
    serviceSk: d.serviceSk as string | undefined,
    serviceEn: d.serviceEn as string | undefined,
    serviceRu: d.serviceRu as string | undefined,
    serviceUk: d.serviceUk as string | undefined,
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? "",
    place: (d.place as Place) ?? "massage",
    createdAt: d.createdAt as Timestamp | undefined,
    scheduleTbd: d.scheduleTbd === true,
    scheduleTbdAdminHint: d.scheduleTbdAdminHint as string | undefined,
  } as AppointmentData;
}

/** Admin: create appointment with optional fields (defaults for empty) */
export async function bookAppointmentAdmin(input: AdminBookingInput, place: Place = "massage"): Promise<AppointmentData> {
  const dateStr = input.date;
  const [startH, startM] = input.startTime.split(":").map(Number);
  const duration = input.durationMinutes ?? 60;
  const newStart = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
  const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

  const normalized: BookingInput = {
    date: dateStr,
    startTime: input.startTime,
    durationMinutes: duration,
    service: input.service?.trim() || "—",
    fullName: input.fullName?.trim() || "—",
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "—",
  };

  return bookAppointment(normalized, place);
}

/** Admin: update appointment fields (time change updates slots) */
export async function updateAppointment(
  appointmentId: string,
  updates: AdminAppointmentUpdate,
  place: Place = "massage"
): Promise<void> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const snap = await getDoc(appointmentRef);
  if (!snap.exists()) throw new Error("APPOINTMENT_NOT_FOUND");

  const data = snap.data();
  const aptPlace = (data.place as Place) ?? place;
  const hasTimeChange = updates.startTime != null || updates.durationMinutes != null;

  if (hasTimeChange) {
    const oldStart = (data.startTime as Timestamp).toDate();
    const oldEnd = (data.endTime as Timestamp).toDate();
    const duration =
      updates.durationMinutes ?? Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000);
    const newStart = updates.startTime ?? oldStart;
    await updateAppointmentTime(appointmentId, newStart, duration);
  }

  const fieldUpdates: Record<string, unknown> = {};
  if (updates.service !== undefined) fieldUpdates.service = updates.service || "—";
  if (updates.fullName !== undefined) fieldUpdates.fullName = updates.fullName || "—";
  if (updates.email !== undefined) fieldUpdates.email = updates.email || "";
  if (updates.phone !== undefined) fieldUpdates.phone = updates.phone || "—";

  if (Object.keys(fieldUpdates).length > 0) {
    await updateDoc(appointmentRef, fieldUpdates);
  }
}

/** Delete an appointment and remove its slot from days */
export async function deleteAppointment(appointmentId: string): Promise<void> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const snap = await getDoc(appointmentRef);

  if (!snap.exists()) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  const data = snap.data();
  if (data.scheduleTbd === true) {
    await deleteDoc(appointmentRef);
    return;
  }

  const place = (data.place as Place | undefined) ?? "massage";
  const start = (data.startTime as Timestamp).toDate();
  const end = (data.endTime as Timestamp).toDate();

  const dateKeys = new Set<string>();
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur.getTime() <= endDay.getTime()) {
    dateKeys.add(getDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const dayRefs = Array.from(dateKeys).map((ds) => doc(db, "days", `${place}_${ds}`));

  await runTransaction(db, async (transaction) => {
    const snaps = await Promise.all(dayRefs.map((ref) => transaction.get(ref)));

    transaction.delete(appointmentRef);

    for (let i = 0; i < dayRefs.length; i++) {
      const daySnap = snaps[i];
      const slots: { id: string; start: Timestamp; end: Timestamp }[] =
        (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];
      const filtered = slots.filter((s) => s.id !== appointmentId);
      transaction.set(dayRefs[i], { slots: filtered }, { merge: true });
    }
  });
}
