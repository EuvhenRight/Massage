/** First-party consent record (GDPR / ePrivacy-style categories). */
export const CONSENT_COOKIE_NAME = 'v2studio_cookie_consent'
export const CONSENT_SCHEMA_VERSION = 1
/** 13 months is a common upper bound for consent cookies; we use 12 months. */
export const CONSENT_MAX_AGE_SEC = 60 * 60 * 24 * 365

export type CookieConsentCategories = {
	necessary: true
	analytics: boolean
	marketing: boolean
}

export type StoredCookieConsent = CookieConsentCategories & {
	v: number
	updatedAt: number
}

export function buildStoredConsent(categories: {
	analytics: boolean
	marketing: boolean
}): StoredCookieConsent {
	return {
		v: CONSENT_SCHEMA_VERSION,
		necessary: true,
		analytics: categories.analytics,
		marketing: categories.marketing,
		updatedAt: Date.now(),
	}
}

function consentCookiePattern(): RegExp {
	return new RegExp(
		`(?:^|; )${CONSENT_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`,
	)
}

export function readConsentFromDocument(): StoredCookieConsent | null {
	if (typeof document === 'undefined') return null
	const match = document.cookie.match(consentCookiePattern())
	if (!match?.[1]) return null
	try {
		const raw = decodeURIComponent(match[1])
		const parsed = JSON.parse(raw) as Partial<StoredCookieConsent>
		if (
			parsed.v !== CONSENT_SCHEMA_VERSION ||
			parsed.necessary !== true ||
			typeof parsed.analytics !== 'boolean' ||
			typeof parsed.marketing !== 'boolean'
		) {
			return null
		}
		return {
			v: CONSENT_SCHEMA_VERSION,
			necessary: true,
			analytics: parsed.analytics,
			marketing: parsed.marketing,
			updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
		}
	} catch {
		return null
	}
}

export function persistConsentToDocument(consent: StoredCookieConsent): void {
	if (typeof document === 'undefined') return
	const secure =
		typeof window !== 'undefined' && window.location.protocol === 'https:'
	const encoded = encodeURIComponent(JSON.stringify(consent))
	let cookie = `${CONSENT_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${CONSENT_MAX_AGE_SEC}; SameSite=Lax`
	if (secure) cookie += '; Secure'
	document.cookie = cookie
}

export function consentAllowsAnalytics(consent: StoredCookieConsent | null): boolean {
	return consent?.v === CONSENT_SCHEMA_VERSION && consent.analytics === true
}

export function consentAllowsMarketing(consent: StoredCookieConsent | null): boolean {
	return consent?.v === CONSENT_SCHEMA_VERSION && consent.marketing === true
}
