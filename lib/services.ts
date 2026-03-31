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
export function findServiceDataForAppointment(
  appointment: { service: string; serviceId?: string },
  services: ServiceData[],
): ServiceData | undefined {
  if (appointment.serviceId) {
    const byId = services.find((x) => x.id === appointment.serviceId);
    if (byId) return byId;
  }
  const needle = normalizeServiceMatchKey(appointment.service);
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
        data.bookingGranularity === "day"
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
