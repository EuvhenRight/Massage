import {
  isPriceUnsetForDisplay,
  getEffectivePriceForBooking,
} from "./price-catalog-price-display";
import {
  normalizeItemBookingDayCount,
  type SexKey,
  type ZonePriceItem,
} from "@/types/price-catalog";

/**
 * One bookable line the customer put in their booking. A booking is a list of
 * these: "leg waxing + arm waxing + ear piercing" is three items on a single
 * appointment occupying one contiguous block of time.
 */
export interface BookingItem {
  /** Stable identity — dedupe key and React key. Catalog item id when the line has one. */
  key: string;
  /** Localized full path, e.g. "Depilation › Legs › Shin". */
  title: string;
  /** Matched Firestore `services` row id, when the line maps to one. */
  serviceId?: string;
  /** Leaf title per locale (path prefix stays locale-bound in `title`). */
  titleSk?: string;
  titleEn?: string;
  titleRu?: string;
  titleUk?: string;
  durationMinutes: number;
  /** Effective price captured when the line was added (sale price when on sale). */
  price?: number | string;
  /** Catalog branch the line came from. */
  sex?: SexKey;
  /** "tbd" lines have no customer-visible calendar and cannot share a booking with timed lines. */
  granularity: "time" | "tbd";
  /** TBD only: how many full days admin will assign. */
  bookingDayCount?: number;
  /** TBD only: message shown to the customer on step 2. */
  scheduleTbdCustomerMessage?: string;
  /** TBD only: hint stored for admin. */
  scheduleTbdAdminHint?: string;
}

/** Guard against a runaway cart — also keeps the summary readable on a phone. */
export const MAX_BOOKING_ITEMS = 12;

const MIN_ITEM_DURATION_MINUTES = 5;
const MAX_TOTAL_DURATION_MINUTES = 24 * 60;

/** Separator between item titles in the denormalized `service` string. */
export const SERVICE_TITLE_SEPARATOR = " + ";

export function normalizeItemDurationMinutes(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(Math.max(n, MIN_ITEM_DURATION_MINUTES), MAX_TOTAL_DURATION_MINUTES);
}

/**
 * Total block length for the booking. TBD carts have no meaningful duration —
 * admin assigns whole days — so they report the single item's nominal length.
 */
export function totalDurationMinutes(items: BookingItem[]): number {
  if (items.length === 0) return 0;
  if (isTbdCart(items)) {
    return normalizeItemDurationMinutes(items[0]?.durationMinutes);
  }
  const sum = items.reduce(
    (acc, i) => acc + normalizeItemDurationMinutes(i.durationMinutes),
    0
  );
  return Math.min(sum, MAX_TOTAL_DURATION_MINUTES);
}

/** True when the cart is a TBD booking (admin assigns dates). TBD lines never mix with timed ones. */
export function isTbdCart(items: BookingItem[]): boolean {
  return items.length > 0 && items[0]!.granularity === "tbd";
}

export function bookingDayCountForCart(items: BookingItem[]): number {
  if (!isTbdCart(items)) return 1;
  return normalizeItemBookingDayCount(items[0]?.bookingDayCount ?? 1);
}

/** Denormalized `service` string kept on the appointment doc for legacy readers, emails and search. */
export function joinItemTitles(
  items: BookingItem[],
  localeKey?: "titleSk" | "titleEn" | "titleRu" | "titleUk"
): string {
  return items
    .map((i) => {
      if (!localeKey) return i.title;
      const localized = i[localeKey];
      return typeof localized === "string" && localized.trim()
        ? localized.trim()
        : i.title;
    })
    .filter(Boolean)
    .join(SERVICE_TITLE_SEPARATOR);
}

export function hasBookingItem(items: BookingItem[], key: string): boolean {
  return items.some((i) => i.key === key);
}

export type AddItemRejection =
  | "duplicate"
  | "max-items"
  /** Adding a TBD line while timed lines are in the cart. */
  | "tbd-into-timed"
  /** Adding a timed line while a TBD line is in the cart. */
  | "timed-into-tbd"
  /** Two different TBD lines — each needs its own arrangement with the salon. */
  | "tbd-into-tbd";

export type AddItemCheck =
  | { ok: true }
  | { ok: false; reason: AddItemRejection };

/**
 * TBD lines (courses, wraps, whitening) have no customer-facing calendar and are
 * arranged individually, so they are booked alone. Everything else stacks freely.
 */
export function canAddBookingItem(
  items: BookingItem[],
  candidate: BookingItem
): AddItemCheck {
  if (hasBookingItem(items, candidate.key)) {
    return { ok: false, reason: "duplicate" };
  }
  if (items.length >= MAX_BOOKING_ITEMS) {
    return { ok: false, reason: "max-items" };
  }
  if (items.length === 0) return { ok: true };
  const cartIsTbd = isTbdCart(items);
  if (candidate.granularity === "tbd") {
    return { ok: false, reason: cartIsTbd ? "tbd-into-tbd" : "tbd-into-timed" };
  }
  if (cartIsTbd) {
    return { ok: false, reason: "timed-into-tbd" };
  }
  return { ok: true };
}

/** Append when allowed; returns the same array reference when rejected so callers can no-op. */
export function addBookingItem(
  items: BookingItem[],
  candidate: BookingItem
): BookingItem[] {
  if (!canAddBookingItem(items, candidate).ok) return items;
  return [...items, candidate];
}

export function removeBookingItem(
  items: BookingItem[],
  key: string
): BookingItem[] {
  return items.filter((i) => i.key !== key);
}

/** Add when missing, remove when present — the catalog row acts as a checkbox. */
export function toggleBookingItem(
  items: BookingItem[],
  candidate: BookingItem
): BookingItem[] {
  if (hasBookingItem(items, candidate.key)) {
    return removeBookingItem(items, candidate.key);
  }
  return addBookingItem(items, candidate);
}

export interface CartPriceTotal {
  /** Sum of the numeric part of every priced line. */
  total: number;
  /**
   * True when at least one line carried qualifying text ("from 30", "25/30"),
   * so the sum is a lower bound rather than a firm quote.
   */
  approximate: boolean;
  /** Lines with no usable price ("—", empty) — excluded from `total`. */
  unpricedCount: number;
  /** False when nothing in the cart had a price at all. */
  hasAnyPrice: boolean;
}

/**
 * Pull a number out of a catalog price. Prices are author-entered and may read
 * "30", "from 30", "25/30" or "—", so anything beyond a bare number marks the
 * total approximate instead of being silently dropped.
 */
export function parseItemPriceValue(price: number | string | undefined | null): {
  value: number | null;
  approximate: boolean;
} {
  if (isPriceUnsetForDisplay(price)) return { value: null, approximate: false };
  if (typeof price === "number") {
    return { value: price, approximate: false };
  }
  const s = String(price).trim();
  const m = s.match(/\d+(?:[.,]\d+)?/);
  if (!m) return { value: null, approximate: false };
  const value = Number(m[0].replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, approximate: false };
  // Anything left once the matched number and currency noise is removed means
  // the author qualified the price ("from", a range, a second figure).
  const rest = s.replace(m[0], "").replace(/[\s€$£,.]/g, "");
  return { value, approximate: rest.length > 0 };
}

export function sumItemPrices(items: BookingItem[]): CartPriceTotal {
  let total = 0;
  let approximate = false;
  let unpricedCount = 0;
  let hasAnyPrice = false;

  for (const item of items) {
    const { value, approximate: approx } = parseItemPriceValue(item.price);
    if (value == null) {
      unpricedCount += 1;
      continue;
    }
    hasAnyPrice = true;
    total += value;
    if (approx) approximate = true;
  }

  // A missing price on one line makes the visible sum incomplete, not wrong —
  // surface it the same way as a qualified price so we never overstate precision.
  if (unpricedCount > 0 && hasAnyPrice) approximate = true;

  return {
    total: Math.round(total * 100) / 100,
    approximate,
    unpricedCount,
    hasAnyPrice,
  };
}

/** Build a cart line from a price-catalog row. */
export function bookingItemFromCatalogItem(args: {
  item: ZonePriceItem;
  /** Localized full path including the leaf, e.g. "Depilation › Legs › Shin". */
  fullTitle: string;
  leafTitle: string;
  sex?: SexKey;
  serviceId?: string;
  scheduleTbdCustomerMessage?: string;
  scheduleTbdAdminHint?: string;
}): BookingItem {
  const { item, fullTitle, leafTitle, sex, serviceId } = args;
  const isTbd =
    item.bookingGranularity === "tbd" || item.bookingGranularity === "day";
  return {
    key: item.id || fullTitle,
    title: fullTitle || leafTitle,
    serviceId,
    titleSk: item.titleSk,
    titleEn: item.titleEn,
    titleRu: item.titleRu,
    titleUk: item.titleUk,
    durationMinutes: normalizeItemDurationMinutes(item.durationMinutes),
    price: isTbd ? undefined : getEffectivePriceForBooking(item),
    sex,
    granularity: isTbd ? "tbd" : "time",
    bookingDayCount: isTbd
      ? normalizeItemBookingDayCount(item.bookingDayCount ?? 1)
      : undefined,
    scheduleTbdCustomerMessage: isTbd
      ? (args.scheduleTbdCustomerMessage ?? "")
      : undefined,
    scheduleTbdAdminHint: isTbd ? (args.scheduleTbdAdminHint ?? "") : undefined,
  };
}

/**
 * Build a cart line from a plain Firestore `services` row — the non-catalog
 * booking path (places without a price catalog).
 */
export function bookingItemFromServiceRow(row: {
  id?: string;
  title: string;
  durationMinutes?: number;
  bookingGranularity?: string;
  bookingDayCount?: number;
  scheduleTbdMessage?: string;
  scheduleTbdAdminNote?: string;
  titleSk?: string;
  titleEn?: string;
  titleRu?: string;
  titleUk?: string;
  /** Price-catalog branch — price and duration differ between them. */
  sex?: SexKey;
}): BookingItem {
  const isTbd =
    row.bookingGranularity === "tbd" || row.bookingGranularity === "day";
  return {
    key: row.id || row.title,
    title: row.title,
    serviceId: row.id,
    titleSk: row.titleSk,
    titleEn: row.titleEn,
    titleRu: row.titleRu,
    titleUk: row.titleUk,
    durationMinutes: normalizeItemDurationMinutes(row.durationMinutes),
    sex: row.sex,
    granularity: isTbd ? "tbd" : "time",
    bookingDayCount: isTbd
      ? normalizeItemBookingDayCount(row.bookingDayCount ?? 1)
      : undefined,
    scheduleTbdCustomerMessage: isTbd ? (row.scheduleTbdMessage ?? "") : undefined,
    scheduleTbdAdminHint: isTbd ? (row.scheduleTbdAdminNote ?? "") : undefined,
  };
}

/** Shape written to Firestore — drops undefined fields, which Firestore rejects. */
export function bookingItemToFirestore(item: BookingItem): Record<string, unknown> {
  const out: Record<string, unknown> = {
    key: item.key,
    title: item.title,
    durationMinutes: normalizeItemDurationMinutes(item.durationMinutes),
    granularity: item.granularity,
  };
  if (item.serviceId) out.serviceId = item.serviceId;
  if (item.titleSk) out.titleSk = item.titleSk;
  if (item.titleEn) out.titleEn = item.titleEn;
  if (item.titleRu) out.titleRu = item.titleRu;
  if (item.titleUk) out.titleUk = item.titleUk;
  if (item.price != null && !isPriceUnsetForDisplay(item.price)) {
    out.price = item.price;
  }
  if (item.sex) out.sex = item.sex;
  if (item.bookingDayCount != null) out.bookingDayCount = item.bookingDayCount;
  if (item.scheduleTbdAdminHint) {
    out.scheduleTbdAdminHint = item.scheduleTbdAdminHint;
  }
  return out;
}

/** Read `items[]` back off an appointment doc; tolerates legacy docs with no array. */
export function bookingItemsFromFirestore(raw: unknown): BookingItem[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title : "";
    if (!title.trim()) continue;
    out.push({
      key: typeof r.key === "string" && r.key ? r.key : title,
      title,
      serviceId: typeof r.serviceId === "string" ? r.serviceId : undefined,
      titleSk: typeof r.titleSk === "string" ? r.titleSk : undefined,
      titleEn: typeof r.titleEn === "string" ? r.titleEn : undefined,
      titleRu: typeof r.titleRu === "string" ? r.titleRu : undefined,
      titleUk: typeof r.titleUk === "string" ? r.titleUk : undefined,
      durationMinutes: normalizeItemDurationMinutes(r.durationMinutes),
      price:
        typeof r.price === "number" || typeof r.price === "string"
          ? r.price
          : undefined,
      sex: r.sex === "woman" || r.sex === "man" ? r.sex : undefined,
      granularity: r.granularity === "tbd" ? "tbd" : "time",
      bookingDayCount:
        typeof r.bookingDayCount === "number"
          ? normalizeItemBookingDayCount(r.bookingDayCount)
          : undefined,
      scheduleTbdAdminHint:
        typeof r.scheduleTbdAdminHint === "string"
          ? r.scheduleTbdAdminHint
          : undefined,
    });
  }
  return out;
}
