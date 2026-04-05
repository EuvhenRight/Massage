import {
  getTitleForLocale,
  type PriceLocale,
  type PriceSection,
  type PriceService,
  type PriceZone,
  type ZonePriceItem,
} from "@/types/price-catalog";

/** Matches `flattenPriceCatalogToServices` path shape for booking `service` param. */
export function getBookableCatalogServiceTitle(
  locale: PriceLocale,
  svc: PriceService | undefined,
  sec: PriceSection | undefined,
  zone: PriceZone | undefined,
  item: ZonePriceItem,
  pathMode: "section" | "rootZone" | "directItems"
): string {
  const itemTitle = getTitleForLocale(item, locale);
  const svcTitle = svc ? getTitleForLocale(svc, locale) : "";
  if (pathMode === "directItems") {
    return svcTitle ? `${svcTitle} › ${itemTitle}` : itemTitle;
  }
  const zoneTitle = zone ? getTitleForLocale(zone, locale) : "";
  if (pathMode === "section" && sec) {
    const secTitle = getTitleForLocale(sec, locale);
    return `${svcTitle} › ${secTitle} › ${zoneTitle} › ${itemTitle}`;
  }
  return `${svcTitle} › ${zoneTitle} › ${itemTitle}`;
}
