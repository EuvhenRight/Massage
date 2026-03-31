import {
  runTransaction,
  doc,
  getDoc,
  updateDoc,
  deleteField,
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
  adminBookingMode?: "time" | "day";
  multiDayFullDayCount?: number;
  adminFullDayDates?: string[];
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
  /** Free-form internal note set by admin */
  adminNote?: string;
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
   * Explicit full-day dates for admin day-only bookings.
   */
  adminFullDayDates?: string[];
  /**
   * Legacy fallback: when >= 1, books this many consecutive full working days from `date`.
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
  adminBookingMode?: "time" | "day";
  adminFullDayDates?: string[];
  multiDayFullDayCount?: number;
  service?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  adminNote?: string;
}

/** Admin can update any field */
export interface AdminAppointmentUpdate {
  service?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  startTime?: Date;
  durationMinutes?: number;
  adminBookingMode?: "time" | "day";
  adminFullDayDates?: string[];
  multiDayFullDayCount?: number;
  adminNote?: string;
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

function clampFullDayCount(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(14, n));
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function sortDateKeys(dateKeys: string[]): string[] {
  return [...dateKeys].sort((a, b) => {
    const dateA = parseDateKey(a);
    const dateB = parseDateKey(b);
    if (!dateA || !dateB) return a.localeCompare(b);
    return dateA.getTime() - dateB.getTime();
  });
}

function normalizeFullDayDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const parsed = parseDateKey(item);
    if (!parsed) continue;
    unique.add(getDateKey(parsed));
    if (unique.size >= 14) break;
  }
  return sortDateKeys(Array.from(unique));
}

/** UI + email: treat as full-day when mode flag is missing but day fields exist */
export function inferAdminBookingModeFromFirestore(
  data: Record<string, unknown>
): "time" | "day" {
  if (data.adminBookingMode === "day") return "day";
  if (data.adminBookingMode === "time") return "time";
  if (normalizeFullDayDates(data.adminFullDayDates).length > 0) return "day";
  const n = Math.floor(Number(data.multiDayFullDayCount));
  if (Number.isFinite(n) && n >= 1) return "day";
  return "time";
}

function getLegacyFullDayDateKeys(startDate: Date, count: number): string[] {
  const safeCount = clampFullDayCount(count);
  const keys: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + i);
    keys.push(getDateKey(current));
  }
  return keys;
}

function getAppointmentDayDateKeys(data: Record<string, unknown>): string[] {
  const explicit = normalizeFullDayDates(data.adminFullDayDates);
  if (explicit.length > 0) return explicit;
  const start = (data.startTime as Timestamp).toDate();
  return getLegacyFullDayDateKeys(start, clampFullDayCount(data.multiDayFullDayCount));
}

async function getFullDayWindowsForDateKeys(
  place: Place,
  dateKeys: string[]
): Promise<{ dayKey: string; start: Date; end: Date }[]> {
  const schedule = await getSchedule(place);
  const normalizedDateKeys = normalizeFullDayDates(dateKeys);
  if (normalizedDateKeys.length === 0) {
    throw new Error("DAY_REQUIRED");
  }
  const windows: { dayKey: string; start: Date; end: Date }[] = [];
  for (const dateKey of normalizedDateKeys) {
    const cal = parseDateKey(dateKey);
    if (!cal) continue;
    const w = fullDayWindowForDate(cal, schedule);
    if (!w) throw new Error("DAY_CLOSED");
    windows.push({ dayKey: `${place}_${getDateKey(cal)}`, ...w });
  }
  return windows;
}

function getSingleTimeWindow(
  place: Place,
  start: Date,
  durationMinutes: number
): { dayKey: string; start: Date; end: Date }[] {
  const slotStart = new Date(start);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
  return [{ dayKey: `${place}_${getDateKey(slotStart)}`, start: slotStart, end: slotEnd }];
}

async function bookFullDayAppointment(
  input: BookingInput,
  place: Place,
  dateKeys: string[]
): Promise<AppointmentData> {
  const schedule = await getSchedule(place);
  const prepBuffer = getPrepBufferMinutes(schedule);
  const normalizedDateKeys = normalizeFullDayDates(dateKeys);
  if (normalizedDateKeys.length === 0) throw new Error("DAY_REQUIRED");
  const windows: { dayKey: string; start: Date; end: Date }[] = [];
  for (const dateKey of normalizedDateKeys) {
    const cal = parseDateKey(dateKey);
    if (!cal) throw new Error("INVALID_DATE");
    const w = fullDayWindowForDate(cal, schedule);
    if (!w) throw new Error("DAY_CLOSED");
    windows.push({ dayKey: `${place}_${dateKey}`, ...w });
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
      adminBookingMode: "day",
      multiDayFullDayCount: normalizedDateKeys.length,
      adminFullDayDates: normalizedDateKeys,
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
      adminBookingMode: "day",
      multiDayFullDayCount: normalizedDateKeys.length,
      adminFullDayDates: normalizedDateKeys,
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
  const explicitDayDates = normalizeFullDayDates(input.adminFullDayDates);
  if (explicitDayDates.length > 0) {
    return bookFullDayAppointment(input, place, explicitDayDates);
  }
  const multi = input.multiDayFullDayCount;
  if (typeof multi === "number" && multi >= 1) {
    return bookFullDayAppointment(
      input,
      place,
      getLegacyFullDayDateKeys(new Date(`${input.date}T12:00:00`), multi)
    );
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

async function replaceAppointmentSchedule(
  appointmentId: string,
  place: Place,
  oldMode: "time" | "day",
  oldStart: Date,
  oldEnd: Date,
  oldDayDates: string[],
  newMode: "time" | "day",
  newStart: Date,
  newDurationMinutes: number,
  newDayDates: string[]
): Promise<{ newStart: Date; newEnd: Date }> {
  const schedule = await getSchedule(place);
  const prepBuffer = getPrepBufferMinutes(schedule);

  const oldWindows =
    oldMode === "day"
      ? await getFullDayWindowsForDateKeys(place, oldDayDates)
      : getSingleTimeWindow(
          place,
          oldStart,
          Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000)
        );
  const newWindows =
    newMode === "day"
      ? await getFullDayWindowsForDateKeys(place, newDayDates)
      : getSingleTimeWindow(place, newStart, newDurationMinutes);

  const dayRefs = new Map<string, ReturnType<typeof doc>>();
  for (const window of [...oldWindows, ...newWindows]) {
    if (!dayRefs.has(window.dayKey)) {
      dayRefs.set(window.dayKey, doc(db, "days", window.dayKey));
    }
  }

  await runTransaction(db, async (transaction) => {
    const entries = Array.from(dayRefs.entries());
    const snaps = new Map<string, Awaited<ReturnType<typeof transaction.get>>>();
    for (const [dayKey, ref] of entries) {
      snaps.set(dayKey, await transaction.get(ref));
    }

    for (const window of newWindows) {
      const snap = snaps.get(window.dayKey);
      const dayData = snap?.data() as
        | { slots?: { id: string; start: Timestamp; end: Timestamp }[] }
        | undefined;
      const slots: { id: string; start: Timestamp; end: Timestamp }[] =
        (snap?.exists() ? dayData?.slots : null) ?? [];
      for (const slot of slots) {
        if (slot.id === appointmentId) continue;
        const existingStart = slot.start.toDate();
        const existingEnd = slot.end.toDate();
        const existingEndWithBuffer = new Date(
          existingEnd.getTime() + prepBuffer * 60 * 1000
        );
        if (overlaps(existingStart, existingEndWithBuffer, window.start, window.end)) {
          throw new Error("OVERLAP");
        }
      }
    }

    for (const [dayKey, ref] of entries) {
      const snap = snaps.get(dayKey);
      const dayData = snap?.data() as
        | { slots?: { id: string; start: Timestamp; end: Timestamp }[] }
        | undefined;
      const slots: { id: string; start: Timestamp; end: Timestamp }[] =
        (snap?.exists() ? dayData?.slots : null) ?? [];
      const filtered = slots.filter((slot) => slot.id !== appointmentId);
      const additions = newWindows
        .filter((window) => window.dayKey === dayKey)
        .map((window) => ({
          id: appointmentId,
          start: Timestamp.fromDate(window.start),
          end: Timestamp.fromDate(window.end),
        }));
      transaction.set(ref, { slots: [...filtered, ...additions] }, { merge: true });
    }
  });

  return {
    newStart: newWindows[0]!.start,
    newEnd: newWindows[newWindows.length - 1]!.end,
  };
}

/** Read a single appointment by ID */
export async function getAppointment(appointmentId: string): Promise<AppointmentData | null> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const snap = await getDoc(appointmentRef);
  if (!snap.exists()) return null;
  const d = snap.data();
  const mode = inferAdminBookingModeFromFirestore(d as Record<string, unknown>);
  const dayKeys = mode === "day" ? getAppointmentDayDateKeys(d) : [];
  return {
    id: snap.id,
    startTime: (d.startTime as Timestamp) ?? new Date(),
    endTime: (d.endTime as Timestamp) ?? new Date(),
    adminBookingMode: mode,
    adminFullDayDates: mode === "day" ? dayKeys : undefined,
    multiDayFullDayCount: mode === "day" ? dayKeys.length : undefined,
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
    adminNote: d.adminNote as string | undefined,
  } as AppointmentData;
}

/** Admin: create appointment with optional fields (defaults for empty) */
export async function bookAppointmentAdmin(input: AdminBookingInput, place: Place = "massage"): Promise<AppointmentData> {
  const dateStr = input.date;
  const [startH, startM] = input.startTime.split(":").map(Number);
  const mode = input.adminBookingMode === "day" ? "day" : "time";
  const dayDates = normalizeFullDayDates(input.adminFullDayDates);
  const dayCount = dayDates.length > 0 ? dayDates.length : clampFullDayCount(input.multiDayFullDayCount);
  const duration = input.durationMinutes ?? 60;
  const newStart = new Date(`${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
  const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

  const normalized: BookingInput = {
    date: dateStr,
    startTime: input.startTime,
    durationMinutes: duration,
    adminFullDayDates: mode === "day" ? dayDates : undefined,
    multiDayFullDayCount: mode === "day" ? dayCount : undefined,
    service: input.service?.trim() || "—",
    fullName: input.fullName?.trim() || "—",
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "—",
  };

  const result = await bookAppointment(normalized, place);

  const ref = doc(db, "appointments", result.id);
  const note = input.adminNote?.trim();
  const storedDayDates =
    mode === "day" && dayDates.length > 0
      ? dayDates
      : mode === "day"
        ? normalizeFullDayDates(result.adminFullDayDates)
        : [];
  const storedDayCount =
    storedDayDates.length > 0 ? storedDayDates.length : dayCount;
  await updateDoc(ref, {
    adminBookingMode: mode,
    ...(mode === "day" && storedDayDates.length > 0
      ? {
          multiDayFullDayCount: storedDayCount,
          adminFullDayDates: storedDayDates,
        }
      : mode !== "day"
        ? {
            multiDayFullDayCount: deleteField(),
            adminFullDayDates: deleteField(),
          }
        : {}),
    ...(note ? { adminNote: note } : {}),
  });
  result.adminBookingMode = mode;
  result.adminFullDayDates =
    mode === "day" && storedDayDates.length > 0 ? storedDayDates : undefined;
  result.multiDayFullDayCount =
    mode === "day" && storedDayDates.length > 0 ? storedDayCount : undefined;
  if (note) result.adminNote = note;

  return result;
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
  const oldStart = (data.startTime as Timestamp).toDate();
  const oldEnd = (data.endTime as Timestamp).toDate();
  const oldMode = data.adminBookingMode === "day" ? "day" : "time";
  const targetMode = updates.adminBookingMode ?? oldMode;
  const oldDayDates =
    oldMode === "day" ? getAppointmentDayDateKeys(data) : [];
  const targetDayDates =
    targetMode === "day"
      ? (() => {
          const explicit = normalizeFullDayDates(updates.adminFullDayDates);
          if (explicit.length > 0) return explicit;
          if (updates.multiDayFullDayCount != null) {
            return getLegacyFullDayDateKeys(
              updates.startTime ?? oldStart,
              updates.multiDayFullDayCount
            );
          }
          return oldDayDates;
        })()
      : [];
  const targetDuration =
    updates.durationMinutes ??
    Math.max(5, Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000));
  const targetStart = updates.startTime ?? oldStart;
  const hasScheduleChange =
    updates.startTime != null ||
    updates.durationMinutes != null ||
    updates.adminBookingMode != null ||
    updates.adminFullDayDates != null ||
    updates.multiDayFullDayCount != null;

  let nextStart = oldStart;
  let nextEnd = oldEnd;
  if (hasScheduleChange) {
    const replaced = await replaceAppointmentSchedule(
      appointmentId,
      aptPlace,
      oldMode,
      oldStart,
      oldEnd,
      oldDayDates,
      targetMode,
      targetStart,
      targetDuration,
      targetDayDates
    );
    nextStart = replaced.newStart;
    nextEnd = replaced.newEnd;
  }

  const fieldUpdates: Record<string, unknown> = {};
  if (updates.service !== undefined) fieldUpdates.service = updates.service || "—";
  if (updates.fullName !== undefined) fieldUpdates.fullName = updates.fullName || "—";
  if (updates.email !== undefined) fieldUpdates.email = updates.email || "";
  if (updates.phone !== undefined) fieldUpdates.phone = updates.phone || "—";
  if (updates.adminNote !== undefined) fieldUpdates.adminNote = updates.adminNote;
  if (hasScheduleChange) {
    fieldUpdates.startTime = Timestamp.fromDate(nextStart);
    fieldUpdates.endTime = Timestamp.fromDate(nextEnd);
    fieldUpdates.adminBookingMode = targetMode;
    fieldUpdates.multiDayFullDayCount =
      targetMode === "day" ? targetDayDates.length : deleteField();
    fieldUpdates.adminFullDayDates =
      targetMode === "day" ? targetDayDates : deleteField();
  }

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
  const dateKeys =
    data.adminBookingMode === "day"
      ? new Set(getAppointmentDayDateKeys(data))
      : new Set([getDateKey((data.startTime as Timestamp).toDate())]);

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
