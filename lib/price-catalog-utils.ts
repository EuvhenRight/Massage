import {
  getTitleForLocale,
  type PriceCatalogStructure,
  type PriceService,
  type PriceSection,
  type PriceZone,
  type ZonePriceItem,
  type PriceLocale,
} from "@/types/price-catalog";

/** Flatten price catalog into a list of { title, durationMinutes } for booking. */
export function flattenPriceCatalogToServices(
  catalog: PriceCatalogStructure,
  locale: PriceLocale
): { title: string; durationMinutes: number }[] {
  const result: { title: string; durationMinutes: number }[] = [];

  function addItem(item: ZonePriceItem, path: string) {
    const itemTitle = getTitleForLocale(item, locale);
    const fullTitle = path ? `${path} › ${itemTitle}` : itemTitle;
    result.push({ title: fullTitle, durationMinutes: item.durationMinutes });
  }

  function processService(svc: PriceService) {
    const svcTitle = getTitleForLocale(svc, locale);
    const sections = svc.sections ?? [];
    const zones = svc.zones ?? [];
    const items = svc.items ?? [];

    for (const sec of sections) {
      const secTitle = getTitleForLocale(sec, locale);
      for (const zone of sec.zones ?? []) {
        const zoneTitle = getTitleForLocale(zone, locale);
        const path = `${svcTitle} › ${secTitle} › ${zoneTitle}`;
        for (const item of zone.items ?? []) addItem(item, path);
      }
    }
    for (const zone of zones) {
      const zoneTitle = getTitleForLocale(zone, locale);
      const path = `${svcTitle} › ${zoneTitle}`;
      for (const item of zone.items ?? []) addItem(item, path);
    }
    for (const item of items) {
      addItem(item, svcTitle);
    }
  }

  for (const svc of catalog.man.services) processService(svc);
  for (const svc of catalog.woman.services) processService(svc);

  return result;
}

export function isPriceCatalogEmpty(
  catalog: PriceCatalogStructure | null | undefined
): boolean {
  if (!catalog) return true;
  const m = catalog.man?.services?.length ?? 0;
  const w = catalog.woman?.services?.length ?? 0;
  return m === 0 && w === 0;
}

/** Map marketing short titles (e.g. "Swedish — Classic") to full catalog path titles. */
export function matchPresetToCatalogTitle(
  flat: { title: string; durationMinutes: number }[],
  preset: string | null | undefined
): string | undefined {
  if (!preset?.trim()) return undefined;
  const p = preset.trim();
  const exact = flat.find((s) => s.title === p);
  if (exact) return exact.title;
  const byLast = flat.find((s) => {
    const last = s.title.split(" › ").pop()?.trim();
    return last === p;
  });
  return byLast?.title;
}
