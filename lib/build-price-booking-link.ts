import type { Place } from "@/lib/places";
import {
  getEffectivePriceForBooking,
  isPriceUnsetForDisplay,
} from "@/lib/price-catalog-price-display";
import { getBookableCatalogServiceTitle } from "@/lib/get-bookable-catalog-service-title";
import type {
  PriceLocale,
  PriceSection,
  PriceService,
  PriceZone,
  ZonePriceItem,
} from "@/types/price-catalog";

export type PriceBookingPathContext = {
  sw?: PriceService;
  sm?: PriceService;
  sectionW?: PriceSection;
  sectionM?: PriceSection;
  zoneW?: PriceZone;
  zoneM?: PriceZone;
  pathMode: "section" | "rootZone" | "directItems";
};

/** Booking URL for one catalog line (woman vs man column). Matches `flattenPriceCatalogToServices` titles. */
export function buildPriceBookingHref(
  locale: PriceLocale,
  localePath: string,
  place: Place,
  item: ZonePriceItem,
  branch: "woman" | "man",
  ctx: PriceBookingPathContext
): string | null {
  const isTbdLine =
    item.bookingGranularity === "tbd" || item.bookingGranularity === "day";
  const effectivePrice = getEffectivePriceForBooking(item);
  if (isPriceUnsetForDisplay(effectivePrice) && !isTbdLine) return null;
  const svc = branch === "woman" ? ctx.sw : ctx.sm;
  const zone = branch === "woman" ? ctx.zoneW : ctx.zoneM;
  const sec = branch === "woman" ? ctx.sectionW : ctx.sectionM;
  if (!svc) return null;
  if (ctx.pathMode === "directItems") {
    const fullTitle = getBookableCatalogServiceTitle(
      locale,
      svc,
      undefined,
      undefined,
      item,
      "directItems"
    );
    return buildHrefParts(localePath, place, fullTitle, item, branch);
  }
  if (!zone) return null;
  let mode: "section" | "rootZone" =
    ctx.pathMode === "section" && sec ? "section" : "rootZone";
  if (mode === "section" && !sec) mode = "rootZone";
  const fullTitle = getBookableCatalogServiceTitle(
    locale,
    svc,
    mode === "section" ? sec : undefined,
    zone,
    item,
    mode
  );
  return buildHrefParts(localePath, place, fullTitle, item, branch);
}

function buildHrefParts(
  localePath: string,
  place: Place,
  serviceTitle: string,
  item: ZonePriceItem,
  branch: "woman" | "man"
): string {
  const bookingPath =
    place === "massage" ? "massage/booking" : "depilation/booking";
  const params = new URLSearchParams();
  params.set("service", serviceTitle);
  const omitDuration =
    item.bookingGranularity === "tbd" || item.bookingGranularity === "day";
  if (!omitDuration) params.set("duration", String(item.durationMinutes));
  params.set("from", "price");
  params.set("sex", branch);
  return `${localePath}/${bookingPath}?${params.toString()}`;
}
