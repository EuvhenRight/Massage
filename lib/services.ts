import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Place } from "./places";
import { DEFAULT_SECTION_CALENDAR_COLOR } from "@/lib/section-calendar-colors";
import { normalizeItemBookingDayCount } from "@/types/price-catalog";

export type Locale = "sk" | "en" | "ru" | "uk";

export type ServiceBookingGranularity = "time" | "day" | "tbd";

export interface ServiceData {
  id: string;
  title: string; // resolved for display (by locale)
  titleSk?: string;
  titleEn?: string;
  titleRu?: string;
  titleUk?: string;
  color: string;
  durationMinutes: number;
  place?: Place;
  /** From price catalog: whole working day vs time slots */
  bookingGranularity?: ServiceBookingGranularity;
  /** Consecutive full days when bookingGranularity is "day" */
  bookingDayCount?: number;
  /** Resolved customer message when bookingGranularity is "tbd" */
  scheduleTbdMessage?: string;
  /** Resolved admin hint when bookingGranularity is "tbd" */
  scheduleTbdAdminNote?: string;
}

/** For matching stored booking strings to catalog rows (booking UI may omit `color`, etc.). */
export type ServiceMatchRow = Omit<
  Pick<ServiceData, "title"> & Partial<Omit<ServiceData, "title">>,
  "bookingGranularity"
> & {
  bookingGranularity?: ServiceBookingGranularity | string;
};

export interface ServiceInput {
  title?: string; // deprecated, use titleSk/titleEn/titleRu/titleUk
  titleSk?: string;
  titleEn?: string;
  titleRu?: string;
  titleUk?: string;
  color: string;
  durationMinutes: number;
  place?: Place;
}

function normalizeServiceMatchKey(s: string): string {
  return s.trim().toLocaleLowerCase();
}

const SERVICE_TITLE_LOCALE_KEYS = ["titleSk", "titleEn", "titleRu", "titleUk"] as const;

/** Fallback slot fill when no service row matches or color is empty/transparent — neutral slate (not a hue). */
export const ADMIN_APPOINTMENT_FALLBACK_COLOR = DEFAULT_SECTION_CALENDAR_COLOR;

/**
 * Match a calendar row to an appointment when `service` was stored in any locale
 * and admin `ServiceData.title` is resolved for the current UI locale.
 */
function matchServiceByNeedle(
  needle: string,
  services: ServiceMatchRow[],
): ServiceMatchRow | undefined {
  if (!needle) return undefined;
  for (const x of services) {
    if (normalizeServiceMatchKey(x.title) === needle) return x;
    for (const key of SERVICE_TITLE_LOCALE_KEYS) {
      const v = x[key];
      if (typeof v === "string" && v.trim() && normalizeServiceMatchKey(v) === needle) {
        return x;
      }
    }
  }
  return undefined;
}

/** Split catalog path "A › B › C" or "A > B > C" into segments. */
function servicePathParts(raw: string): string[] {
  return raw
    .split(/\s*(?:›|>)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function findServiceDataForAppointment(
  appointment: { service: string; serviceId?: string },
  services: ServiceMatchRow[],
): ServiceMatchRow | undefined {
  if (appointment.serviceId) {
    const byId = services.find((x) => x.id === appointment.serviceId);
    if (byId) return byId;
  }
  const needle = normalizeServiceMatchKey(appointment.service);
  const full = matchServiceByNeedle(needle, services);
  if (full) return full;
  const parts = servicePathParts(appointment.service);
  if (parts.length > 1) {
    for (let n = parts.length; n >= 1; n--) {
      const chunk = parts.slice(-n);
      const withGuillemet = normalizeServiceMatchKey(chunk.join(" › "));
      const hitG = matchServiceByNeedle(withGuillemet, services);
      if (hitG) return hitG;
      const withSpace = normalizeServiceMatchKey(chunk.join(" "));
      const hitS = matchServiceByNeedle(withSpace, services);
      if (hitS) return hitS;
    }
  }
  return undefined;
}

const ADMIN_APPOINTMENT_FULL_DAY_MAX = 14;

function clampAdminAppointmentFullDayCount(n: number): number {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.min(ADMIN_APPOINTMENT_FULL_DAY_MAX, x));
}

function catalogRequiredFullDayCount(catalog: ServiceMatchRow | undefined): number | undefined {
  if (!catalog) return undefined;
  if (catalog.bookingGranularity !== "day" && catalog.bookingGranularity !== "tbd") {
    return undefined;
  }
  return clampAdminAppointmentFullDayCount(catalog.bookingDayCount ?? 1);
}

/**
 * How many calendar day rows this booking should use in admin (TBD assignment, full-day edits).
 * Uses the maximum of explicit dates, stored `multiDayFullDayCount`, and the matched catalog item
 * so an under-counted or missing Firestore value cannot hide extra day pickers.
 */
export function resolveAppointmentRequiredFullDayCount(
  appointment: {
    adminFullDayDates?: string[];
    multiDayFullDayCount?: number;
    adminBookingMode?: string;
    scheduleTbd?: boolean;
  },
  catalog?: ServiceMatchRow,
): number {
  const rawDates = appointment.adminFullDayDates;
  const explicit =
    Array.isArray(rawDates) && rawDates.length > 0
      ? rawDates.filter((d) => typeof d === "string" && d.trim()).length
      : 0;
  const storedRaw = appointment.multiDayFullDayCount;
  const stored =
    typeof storedRaw === "number" && storedRaw >= 1
      ? clampAdminAppointmentFullDayCount(storedRaw)
      : undefined;
  const cat = catalogRequiredFullDayCount(catalog);

  const tbd = appointment.scheduleTbd === true;
  const dayMode = appointment.adminBookingMode === "day";
  if (!tbd && !dayMode) {
    return 1;
  }

  const parts: number[] = [];
  if (explicit > 0) parts.push(explicit);
  if (stored != null) parts.push(stored);
  if (cat != null) parts.push(cat);
  if (parts.length === 0) return 1;
  return Math.max(...parts);
}

/** Match booking step selection to catalog row (exact title or path-style `A › B › C`). */
export function findBookableServiceForSelection(
  selectedTitle: string,
  services: ServiceMatchRow[],
): ServiceMatchRow | undefined {
  const t = selectedTitle.trim();
  if (!t) return undefined;
  const exact = services.find((x) => x.title === t);
  if (exact) return exact;
  return findServiceDataForAppointment({ service: t }, services);
}

function resolveTitle(data: Record<string, unknown>, locale: Locale): string {
  const key = `title${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as "titleSk" | "titleEn" | "titleRu" | "titleUk";
  return (data[key] as string) ?? (data.title as string) ?? "";
}

function resolveScheduleTbdField(
  data: Record<string, unknown>,
  locale: Locale,
  prefix: "scheduleTbdMessage" | "scheduleTbdAdminNote"
): string {
  const key = `${prefix}${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as string;
  const v = (data[key] as string)?.trim();
  if (v) return v;
  const sk = (data[`${prefix}Sk`] as string)?.trim();
  return sk ?? "";
}

const SERVICES_COLLECTION = "services";

export async function getServices(place?: Place, locale: Locale = "sk"): Promise<ServiceData[]> {
  const constraints = [];
  if (place) constraints.push(where("place", "==", place));
  constraints.push(orderBy("title", "asc"));
  const q = query(
    collection(db, SERVICES_COLLECTION),
    ...constraints
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    const title = resolveTitle(data, locale);
    return {
      id: d.id,
      title: (title || (data.title as string)) ?? "",
      titleSk: data.titleSk as string | undefined,
      titleEn: data.titleEn as string | undefined,
      titleRu: data.titleRu as string | undefined,
      titleUk: data.titleUk as string | undefined,
      color: (data.color as string) ?? DEFAULT_SECTION_CALENDAR_COLOR,
      durationMinutes: (data.durationMinutes as number) ?? 60,
      place: (data.place as Place) ?? "massage",
      bookingGranularity:
        data.bookingGranularity === "day"
          ? "day"
          : data.bookingGranularity === "tbd"
            ? "tbd"
            : data.bookingGranularity === "time"
              ? "time"
              : undefined,
      bookingDayCount:
        data.bookingGranularity === "day" ||
        data.bookingGranularity === "tbd"
          ? normalizeItemBookingDayCount(data.bookingDayCount)
          : undefined,
      scheduleTbdMessage:
        data.bookingGranularity === "tbd"
          ? resolveScheduleTbdField(data, locale, "scheduleTbdMessage")
          : undefined,
      scheduleTbdAdminNote:
        data.bookingGranularity === "tbd"
          ? resolveScheduleTbdField(data, locale, "scheduleTbdAdminNote")
          : undefined,
    };
  });
}

export async function createService(input: ServiceInput, place: Place = "massage"): Promise<ServiceData> {
  const titleSk = (input.titleSk ?? input.title ?? "").trim();
  const titleEn = (input.titleEn ?? "").trim();
  const titleRu = (input.titleRu ?? "").trim();
  const titleUk = (input.titleUk ?? "").trim();
  const ref = await addDoc(collection(db, SERVICES_COLLECTION), {
    title: titleSk,
    titleSk,
    titleEn: titleEn || titleSk,
    titleRu: titleRu || titleSk,
    titleUk: titleUk || titleSk,
    color: input.color,
    durationMinutes: Math.max(15, Math.min(240, input.durationMinutes)),
    place,
  });
  return {
    id: ref.id,
    title: titleSk,
    titleSk,
    titleEn: titleEn || titleSk,
    titleRu: titleRu || titleSk,
    titleUk: titleUk || titleSk,
    color: input.color,
    durationMinutes: Math.max(15, Math.min(240, input.durationMinutes)),
    place,
  };
}

export async function updateService(
  id: string,
  updates: Partial<ServiceInput>
): Promise<void> {
  const ref = doc(db, SERVICES_COLLECTION, id);
  const data: Record<string, unknown> = {};
  if (updates.titleSk !== undefined) {
    data.titleSk = updates.titleSk.trim();
    data.title = updates.titleSk.trim();
  }
  if (updates.titleEn !== undefined) data.titleEn = updates.titleEn.trim();
  if (updates.titleRu !== undefined) data.titleRu = updates.titleRu.trim();
  if (updates.titleUk !== undefined) data.titleUk = updates.titleUk.trim();
  if (updates.title !== undefined && updates.titleSk === undefined) data.title = updates.title.trim();
  if (updates.color !== undefined) data.color = updates.color;
  if (updates.durationMinutes !== undefined)
    data.durationMinutes = Math.max(15, Math.min(240, updates.durationMinutes));
  if (Object.keys(data).length > 0) {
    await updateDoc(ref, data);
  }
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, SERVICES_COLLECTION, id));
}
