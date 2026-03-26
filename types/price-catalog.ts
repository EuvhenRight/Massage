/** Supported locales for price catalog (title/description) */
export type PriceLocale = "sk" | "en" | "ru" | "uk";

/** Localized text: title required, description optional */
export interface LocalizedText {
  titleSk: string;
  titleEn?: string;
  titleRu?: string;
  titleUk?: string;
  descriptionSk?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionUk?: string;
}

/** How the customer books this line: time slot, full day(s), or arrange date with you (no online calendar). */
export type PriceItemBookingGranularity = "time" | "day" | "tbd";

/** Zone item: one bookable line (e.g. "Upper lip") with time and price */
export interface ZonePriceItem extends LocalizedText {
  id: string;
  durationMinutes: number;
  /** Price as number (cents or main unit) or string e.g. "from 20" */
  price: number | string;
  /** Omit or "time" = pick a time slot; "day" = full day(s); "tbd" = message only, date set by you later. */
  bookingGranularity?: PriceItemBookingGranularity;
  /**
   * When `bookingGranularity` is "day": number of consecutive calendar days (1–14).
   * Ignored for "time" / "tbd". Omit = 1.
   */
  bookingDayCount?: number;
  /** When `bookingGranularity` is "tbd": text shown to the customer on the booking step (per locale). */
  scheduleTbdMessageSk?: string;
  scheduleTbdMessageEn?: string;
  scheduleTbdMessageRu?: string;
  scheduleTbdMessageUk?: string;
  /** When `bookingGranularity` is "tbd": hint for you in admin (e.g. study block — assign manually). */
  scheduleTbdAdminNoteSk?: string;
  scheduleTbdAdminNoteEn?: string;
  scheduleTbdAdminNoteRu?: string;
  scheduleTbdAdminNoteUk?: string;
}

/** Zone: group of body areas (e.g. "Face", "Hands and body") */
export interface PriceZone extends LocalizedText {
  id: string;
  /**
   * Calendar color when this zone sits directly under a service (no parent section).
   * Ignored for booking color when the zone is inside a section — parent section color wins.
   */
  calendarColor?: string;
  items: ZonePriceItem[];
}

/** Section: e.g. "Laser epilation", "Electroepilation" (optional under service) */
export interface PriceSection extends LocalizedText {
  id: string;
  /** Calendar chip color (Tailwind classes); auto-assigned per section, shared by all items inside */
  calendarColor?: string;
  zones?: PriceZone[];
}

/** Service: e.g. "Depilation" - can have sections, zones, or direct items (most flexible) */
export interface PriceService extends LocalizedText {
  id: string;
  /** Used for calendar color of direct `items` only (no zones/sections) */
  calendarColor?: string;
  sections?: PriceSection[];
  zones?: PriceZone[];
  /** Direct items when no section or zone (e.g. single-service catalog) */
  items?: ZonePriceItem[];
}

/** One sex branch: man or woman with list of services */
export interface SexCatalog {
  services: PriceService[];
}

/** Full price catalog for a place (e.g. depilation) */
export interface PriceCatalogStructure {
  man: SexCatalog;
  woman: SexCatalog;
}

export type SexKey = "man" | "woman";

const TITLE_KEYS: (keyof LocalizedText)[] = [
  "titleSk",
  "titleEn",
  "titleRu",
  "titleUk",
];

/** Resolve title for a locale from LocalizedText. Tries locale key, then titleSk, then other locales, then id. */
export function getTitleForLocale(
  item: LocalizedText | (LocalizedText & { id?: string }) | undefined | null,
  locale: PriceLocale
): string {
  if (!item) return "";
  const rec = item as unknown as Record<string, unknown>;
  const localeKey =
    `title${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as keyof LocalizedText;
  for (const key of [localeKey, "titleSk", ...TITLE_KEYS.filter((k) => k !== localeKey && k !== "titleSk")]) {
    const v = rec[key as string];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const withId = item as { id?: string };
  return typeof withId.id === "string" ? withId.id : "";
}

/** Resolve description for a locale */
export function getDescriptionForLocale(
  item: LocalizedText | undefined | null,
  locale: PriceLocale
): string {
  if (!item) return "";
  const key =
    `description${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as keyof LocalizedText;
  const v = (item as unknown as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

/** Customer-facing “we’ll arrange the date” message for `tbd` items */
export function getScheduleTbdMessageForLocale(
  item: ZonePriceItem,
  locale: PriceLocale
): string {
  const key =
    `scheduleTbdMessage${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as keyof ZonePriceItem;
  const v = (item as unknown as Record<string, unknown>)[key as string];
  if (typeof v === "string" && v.trim()) return v.trim();
  const sk = item.scheduleTbdMessageSk;
  return typeof sk === "string" && sk.trim() ? sk.trim() : "";
}

/** Admin-only note for `tbd` items (calendar / assignment) */
export function getScheduleTbdAdminNoteForLocale(
  item: ZonePriceItem,
  locale: PriceLocale
): string {
  const key =
    `scheduleTbdAdminNote${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as keyof ZonePriceItem;
  const v = (item as unknown as Record<string, unknown>)[key as string];
  if (typeof v === "string" && v.trim()) return v.trim();
  const sk = item.scheduleTbdAdminNoteSk;
  return typeof sk === "string" && sk.trim() ? sk.trim() : "";
}

/** Generate a simple id for new items */
export function generatePriceItemId(): string {
  return `pi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Max consecutive full-day bookings per price line */
export const MAX_ITEM_BOOKING_DAY_COUNT = 14;

export function normalizeItemBookingDayCount(raw: unknown): number {
  const n = Math.floor(Number(raw));
  const v = Number.isFinite(n) && n >= 1 ? n : 1;
  return Math.min(MAX_ITEM_BOOKING_DAY_COUNT, v);
}
