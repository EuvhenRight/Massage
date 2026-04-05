import type { ZonePriceItem } from "@/types/price-catalog";

/**
 * Public price list: show "—" when price is intentionally empty or placeholder.
 * Booking links are disabled for these rows (see {@link buildPriceBookingHref}).
 */
export function isPriceUnsetForDisplay(
  price: number | string | undefined | null
): boolean {
  if (price == null) return true;
  if (typeof price === "number") {
    return !Number.isFinite(price);
  }
  const s = String(price).trim();
  if (s.length === 0) return true;
  if (s === "—" || s === "-" || s === "–") return true;
  return false;
}

/** True when the line should show and book at the sale price (handles legacy / stored flag shapes). */
export function isPriceSaleActive(item: ZonePriceItem): boolean {
  const raw = (item as { onSale?: unknown }).onSale;
  const on =
    raw === true ||
    raw === 1 ||
    raw === "true" ||
    raw === "1";
  return (
    on &&
    item.salePrice != null &&
    !isPriceUnsetForDisplay(item.salePrice)
  );
}

/** For non–TBD lines: booking is allowed when this value is set (sale price when on sale). */
export function getEffectivePriceForBooking(item: ZonePriceItem): number | string | undefined {
  if (isPriceSaleActive(item)) {
    return item.salePrice;
  }
  return item.price;
}
