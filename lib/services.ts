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

export type Locale = "sk" | "en" | "ru" | "uk";

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

function resolveTitle(data: Record<string, unknown>, locale: Locale): string {
  const key = `title${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as "titleSk" | "titleEn" | "titleRu" | "titleUk";
  return (data[key] as string) ?? (data.title as string) ?? "";
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
      color: (data.color as string) ?? "bg-gray-500/30 border-gray-500/60",
      durationMinutes: (data.durationMinutes as number) ?? 60,
      place: (data.place as Place) ?? "massage",
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
