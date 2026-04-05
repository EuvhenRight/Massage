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
