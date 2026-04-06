/**
 * Admin price / sale price fields: allow letters, digits, hyphen, spaces, comma and period
 * (for ranges like "20–30", labels like "od 50", or decimals). Strips other characters.
 * Latin extended + Cyrillic letter ranges (no `\p` — keeps TS default target happy).
 */
const SANITIZE_PRICE_FIELD =
	/[^0-9a-zA-Z\s\-.,\u00C0-\u024F\u0400-\u04FF\u2013\u2014]/g

export function sanitizePriceCatalogFieldInput(raw: string): string {
	return raw.replace(SANITIZE_PRICE_FIELD, '')
}

/**
 * Store as number only when the whole value is a plain decimal (optional comma as decimal sep).
 * Otherwise keep as string so ranges and text labels are not mangled by parseFloat.
 */
export function parsePriceCatalogFieldToStored(
	sanitized: string,
): number | string {
	const s = sanitized.trim()
	if (s === '') return ''
	const normalized = s.replace(',', '.')
	if (/^\d+(\.\d+)?$/.test(normalized)) {
		const n = parseFloat(normalized)
		return Number.isFinite(n) ? n : sanitized
	}
	return sanitized
}
