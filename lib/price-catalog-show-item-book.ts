import type { PriceSection } from "@/types/price-catalog";

/**
 * Per-line Book links are disabled on the public price page (use section-level buttons instead).
 */
export function shouldShowPriceRowBookLink(
  _place: string,
  _section: PriceSection | null | undefined
): boolean {
  return false;
}
