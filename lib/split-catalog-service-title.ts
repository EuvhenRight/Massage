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
  const titles = bookingServiceLineTitles(service);
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
