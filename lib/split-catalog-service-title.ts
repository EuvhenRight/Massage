/** Same separator as `flattenPriceCatalogToServices` / booking `service` strings. */
export const CATALOG_SERVICE_TITLE_SEP = " › ";

/**
 * Splits a full catalog line like `Depilation › Laser › Arms › Full arms` into
 * a breadcrumb prefix and the **last** segment (the bookable line the client chose).
 */
export function splitCatalogServiceTitle(fullTitle: string): {
  breadcrumb: string | null;
  lineTitle: string;
} {
  const raw = fullTitle.trim();
  if (!raw) return { breadcrumb: null, lineTitle: "" };
  if (!raw.includes(CATALOG_SERVICE_TITLE_SEP)) {
    return { breadcrumb: null, lineTitle: raw };
  }
  const parts = raw
    .split(CATALOG_SERVICE_TITLE_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { breadcrumb: null, lineTitle: parts[0] ?? raw };
  }
  const lineTitle = parts[parts.length - 1]!;
  const breadcrumb = parts.slice(0, -1).join(CATALOG_SERVICE_TITLE_SEP);
  return { breadcrumb, lineTitle };
}

/**
 * Separator between service titles in a multi-service booking's denormalized
 * `service` string. Must match `SERVICE_TITLE_SEPARATOR` in `lib/booking-items.ts`.
 */
export const BOOKING_SERVICE_JOIN_SEP = " + ";

/**
 * Split a booking's `service` string back into one entry per booked service.
 *
 * Notifications receive `service` as a flat string, so a multi-service booking
 * arrives as `"A › B › Legs + C › D › Arms"`. Splitting on the join separator
 * is a heuristic — a catalog line containing " + " would split wrongly — so
 * callers that hold the structured items should pass those instead and use this
 * only as the fallback for admin-created and legacy bookings.
 */
export function splitBookingServiceTitles(service: string): string[] {
  const raw = service.trim();
  if (!raw) return [];
  return raw
    .split(BOOKING_SERVICE_JOIN_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Leaf title of every booked service — what the customer actually recognises.
 * `"Depilácia › Nohy › Lýtko + Depilácia › Ruky › Predlaktie"` → `["Lýtko", "Predlaktie"]`.
 */
export function bookingServiceLineTitles(service: string): string[] {
  return splitBookingServiceTitles(service).map(
    (t) => splitCatalogServiceTitle(t).lineTitle || t
  );
}

/**
 * A leaf that only names a *variant* of its parent and is meaningless alone.
 *
 * Massage lines are shaped `Masáž › Relaxačná › 1 hodina`: the leaf carries the
 * duration, the parent carries which massage it is. Taking the leaf alone left
 * the customer with a WhatsApp message that said "1 hodina" and never named the
 * service. Depilation lines end in a real name (`… › Lýtko`), so they are
 * unaffected by this and keep rendering exactly as before.
 *
 * Two shapes, across sk / en / ru / uk:
 *   - a duration — "1 hodina", "1,5 часа", "2 hours", "90 min"
 *   - the catch-all body-parts line — "jednotlivé časti tela (…)"
 */
const VARIANT_ONLY_LEAF =
  /^\s*\d+(?:[.,]\d+)?\s*(?:hod(?:ina|iny|ín)?|hour(?:s)?|h|час(?:а|ов|у)?|годин(?:а|и|у)?|min(?:\.|út|uty|utes)?|мин(?:\.|ут|уты)?|хв(?:\.|илин)?)\s*$|(?:časti\s+tela|части\s+тела|частини\s+тіла|body\s+parts|parts\s+of\s+the\s+body)/i;

/**
 * Customer-facing label for one booked service in a notification.
 *
 * Normally the leaf — that is the line the customer picked. When the leaf only
 * names a variant ({@link VARIANT_ONLY_LEAF}) the immediate parent is prepended,
 * so "1 hodina" becomes "Relaxačná — 1 hodina".
 */
export function messageServiceLabel(fullTitle: string): string {
  const { breadcrumb, lineTitle } = splitCatalogServiceTitle(fullTitle);
  const leaf = lineTitle || fullTitle.trim();
  if (!breadcrumb || !VARIANT_ONLY_LEAF.test(leaf)) return leaf;
  const parents = breadcrumb
    .split(CATALOG_SERVICE_TITLE_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
  const parent = parents[parents.length - 1];
  return parent ? `${parent} — ${leaf}` : leaf;
}

/**
 * Approved Twilio Content Templates expose a booking's services as one
 * variable, so a multi-service booking must be flattened into a single string.
 * A runaway list would push the rendered template past what WhatsApp displays,
 * so cap it and mark the overflow — never drop services silently.
 */
export const WHATSAPP_SERVICE_MAX_CHARS = 120;

export function flattenServiceTitlesForWhatsApp(
  service: string,
  maxChars: number = WHATSAPP_SERVICE_MAX_CHARS
): string {
  const titles = splitBookingServiceTitles(service).map(messageServiceLabel);
  if (titles.length === 0) return service;
  const joined = titles.join(", ");
  if (joined.length <= maxChars) return joined;

  // Keep whole service names — a name cut mid-word reads like a bug.
  const kept: string[] = [];
  let used = 0;
  for (const title of titles) {
    const cost = kept.length === 0 ? title.length : title.length + 2;
    if (used + cost > maxChars) break;
    kept.push(title);
    used += cost;
  }
  if (kept.length === 0) {
    return `${titles[0]!.slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return `${kept.join(", ")} …`;
}
