import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Place } from "./places";
import type { PriceCatalogStructure } from "@/types/price-catalog";

const COLLECTION = "priceCatalog";

export async function getPriceCatalog(
  place: Place
): Promise<PriceCatalogStructure | null> {
  const ref = doc(db, COLLECTION, place);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PriceCatalogStructure;
}

export async function setPriceCatalog(
  place: Place,
  structure: PriceCatalogStructure
): Promise<void> {
  const ref = doc(db, COLLECTION, place);
  await setDoc(ref, structure);
}
