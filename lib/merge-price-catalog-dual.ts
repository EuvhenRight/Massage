import type {
  PriceSection,
  PriceService,
  PriceZone,
  ZonePriceItem,
} from "@/types/price-catalog";

/**
 * Pair woman vs man catalog nodes by a stable merge key (trim + lowercase SK, then EN, then id).
 * Sections also use a shared bucket for laser / electro so mismatched SK vs EN between branches
 * still produce one merged block on the public price page.
 */
function titleMergeKey(
  s: { titleSk: string; titleEn?: string; id?: string }
): string {
  const sk = String(s.titleSk ?? "").trim().toLowerCase();
  if (sk.length > 0) return sk;
  const en = String(s.titleEn ?? "").trim().toLowerCase();
  if (en.length > 0) return en;
  return String(s.id ?? "").trim();
}

function sectionMergeKey(s: PriceSection): string {
  const hay = [s.titleSk, s.titleEn, s.titleRu, s.titleUk]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join(" ")
    .toLowerCase();
  if (/\blaser\b|лазер|лазерна|laserová/i.test(hay)) return "__laser_section__";
  if (/\belectro\b|електро|электро|elektro|електроепіл/i.test(hay))
    return "__electro_section__";
  return titleMergeKey(s);
}

function mergeByKey<T>(
  wList: T[],
  mList: T[],
  keyFn: (x: T) => string
): { w?: T; m?: T }[] {
  const mByKey = new Map<string, T>();
  for (const m of mList) {
    mByKey.set(keyFn(m), m);
  }
  const usedM = new Set<string>();
  const out: { w?: T; m?: T }[] = [];
  for (const w of wList) {
    const k = keyFn(w);
    const m = mByKey.get(k);
    if (m) usedM.add(k);
    out.push({ w, m });
  }
  for (const m of mList) {
    const k = keyFn(m);
    if (!usedM.has(k)) out.push({ w: undefined, m });
  }
  return out;
}

export function mergeItemPairs(
  w?: ZonePriceItem[],
  m?: ZonePriceItem[]
): { w?: ZonePriceItem; m?: ZonePriceItem }[] {
  return mergeByKey(w ?? [], m ?? [], titleMergeKey);
}

export function mergeZonePairs(
  w?: PriceZone[],
  m?: PriceZone[]
): { w?: PriceZone; m?: PriceZone }[] {
  return mergeByKey(w ?? [], m ?? [], titleMergeKey);
}

export function mergeSectionPairs(
  w?: PriceSection[],
  m?: PriceSection[]
): { w?: PriceSection; m?: PriceSection }[] {
  return mergeByKey(w ?? [], m ?? [], sectionMergeKey);
}

export function mergeServicePairs(
  w?: PriceService[],
  m?: PriceService[]
): { w?: PriceService; m?: PriceService }[] {
  return mergeByKey(w ?? [], m ?? [], titleMergeKey);
}
