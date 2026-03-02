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

export interface ServiceData {
  id: string;
  title: string;
  color: string;
  durationMinutes: number;
  place?: Place;
}

export interface ServiceInput {
  title: string;
  color: string;
  durationMinutes: number;
  place?: Place;
}

const SERVICES_COLLECTION = "services";

export async function getServices(place?: Place): Promise<ServiceData[]> {
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
    return {
      id: d.id,
      title: (data.title as string) ?? "",
      color: (data.color as string) ?? "bg-gray-500/30 border-gray-500/60",
      durationMinutes: (data.durationMinutes as number) ?? 60,
      place: (data.place as Place) ?? "massage",
    };
  });
}

export async function createService(input: ServiceInput, place: Place = "massage"): Promise<ServiceData> {
  const ref = await addDoc(collection(db, SERVICES_COLLECTION), {
    title: input.title.trim(),
    color: input.color,
    durationMinutes: Math.max(15, Math.min(240, input.durationMinutes)),
    place,
  });
  return {
    id: ref.id,
    ...input,
    durationMinutes: Math.max(15, Math.min(240, input.durationMinutes)),
  };
}

export async function updateService(
  id: string,
  updates: Partial<ServiceInput>
): Promise<void> {
  const ref = doc(db, SERVICES_COLLECTION, id);
  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title.trim();
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
