import {
  runTransaction,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Place } from "./places";
import { getDateKey } from "./booking";
import { getPrepBufferMinutes } from "./availability-firestore";
import { getSchedule } from "./schedule-firestore";

export interface AppointmentData {
  id: string;
  startTime: Timestamp | Date;
  endTime: Timestamp | Date;
  service: string;
  fullName: string;
  email: string;
  phone: string;
  place?: Place;
  createdAt?: Timestamp;
}

export interface BookingInput {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  service: string;
  fullName: string;
  email: string;
  phone: string;
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

export async function bookAppointment(input: BookingInput, place: Place = "massage"): Promise<AppointmentData> {
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

    transaction.set(appointmentRef, {
      startTime: Timestamp.fromDate(newStart),
      endTime: Timestamp.fromDate(newEnd),
      service: input.service,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      place,
      createdAt: serverTimestamp(),
    });

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
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
    } as AppointmentData;
  });
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
      oldDayKey !== newDayKey ? transaction.get(oldDayRef) : Promise.resolve(null),
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
    });

    const newSlots = slots.filter((s) => s.id !== appointmentId);
    newSlots.push({
      id: appointmentId,
      start: Timestamp.fromDate(newStart),
      end: Timestamp.fromDate(newEnd),
    });
    transaction.set(dayRef, { slots: newSlots }, { merge: true });

    if (oldDayKey !== newDayKey && oldDaySnap) {
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
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? "",
    place: (d.place as Place) ?? "massage",
    createdAt: d.createdAt as Timestamp | undefined,
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
  const place = data.place as Place | undefined;
  const start = (data.startTime as Timestamp).toDate();
  const dateStr = getDateKey(start);
  const dayKey = place ? `${place}_${dateStr}` : dateStr;

  const dayRef = doc(db, "days", dayKey);

  await runTransaction(db, async (transaction) => {
    // All reads must happen before any writes
    const daySnap = await transaction.get(dayRef);
    const slots: { id: string; start: Timestamp; end: Timestamp }[] =
      (daySnap.exists() ? (daySnap.data()?.slots as typeof slots) : null) ?? [];
    const filtered = slots.filter((s) => s.id !== appointmentId);

    transaction.delete(appointmentRef);
    transaction.set(dayRef, { slots: filtered }, { merge: true });
  });
}
