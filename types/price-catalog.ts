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

/** Zone item: one bookable line (e.g. "Upper lip") with time and price */
export interface ZonePriceItem extends LocalizedText {
  id: string;
  durationMinutes: number;
  /** Price as number (cents or main unit) or string e.g. "from 20" */
  price: number | string;
}

/** Zone: group of body areas (e.g. "Face", "Hands and body") */
export interface PriceZone extends LocalizedText {
  id: string;
  items: ZonePriceItem[];
}

/** Section: e.g. "Laser epilation", "Electroepilation" (optional under service) */
export interface PriceSection extends LocalizedText {
  id: string;
  zones?: PriceZone[];
}

/** Service: e.g. "Depilation" - can have sections, zones, or direct items (most flexible) */
export interface PriceService extends LocalizedText {
  id: string;
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

/** Generate a simple id for new items */
export function generatePriceItemId(): string {
  return `pi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
