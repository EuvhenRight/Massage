import type {
  PriceSection,
  PriceService,
  PriceZone,
  ZonePriceItem,
} from "@/types/price-catalog";

/** Pair nodes from woman vs man branches by `titleSk` (woman order first, then man-only rows). */
function mergeByTitleSk<
  W extends { titleSk: string },
  M extends { titleSk: string },
>(wList: W[], mList: M[]): { w?: W; m?: M }[] {
  const mByTitle = new Map(mList.map((x) => [x.titleSk, x]));
  const usedM = new Set<string>();
  const out: { w?: W; m?: M }[] = [];
  for (const w of wList) {
    const m = mByTitle.get(w.titleSk);
    if (m) usedM.add(m.titleSk);
    out.push({ w, m });
  }
  for (const m of mList) {
    if (!usedM.has(m.titleSk)) out.push({ w: undefined, m });
  }
  return out;
}

export function mergeItemPairs(
  w?: ZonePriceItem[],
  m?: ZonePriceItem[]
): { w?: ZonePriceItem; m?: ZonePriceItem }[] {
  return mergeByTitleSk(w ?? [], m ?? []);
}

export function mergeZonePairs(
  w?: PriceZone[],
  m?: PriceZone[]
): { w?: PriceZone; m?: PriceZone }[] {
  return mergeByTitleSk(w ?? [], m ?? []);
}

export function mergeSectionPairs(
  w?: PriceSection[],
  m?: PriceSection[]
): { w?: PriceSection; m?: PriceSection }[] {
  return mergeByTitleSk(w ?? [], m ?? []);
}

export function mergeServicePairs(
  w?: PriceService[],
  m?: PriceService[]
): { w?: PriceService; m?: PriceService }[] {
  return mergeByTitleSk(w ?? [], m ?? []);
}
