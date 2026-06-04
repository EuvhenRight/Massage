/**
 * Detect link-preview / crawler User-Agents that fetch URLs without a real
 * user click. WhatsApp, Facebook, Slack, Telegram and similar messengers
 * proactively fetch links to render preview cards — and a GET endpoint that
 * has side effects (like our confirm/cancel routes) will fire those side
 * effects from the preview fetch, **silently confirming or cancelling**
 * bookings the customer never clicked on.
 *
 * The fix here is a soft guard: we look for known crawler signatures in the
 * `User-Agent` header and short-circuit before the state transition runs.
 * UA-based detection isn't bulletproof (anyone can spoof a UA), but it
 * stops the common, well-behaved crawlers that cause the real-world bug
 * reports.
 *
 * Patterns cover:
 *   - WhatsApp's official preview bot
 *   - Meta's `facebookexternalhit` and newer `meta-externalagent`
 *   - Slack, Telegram, Discord, LinkedIn, Twitter
 *   - Generic catch-all (`bot`, `crawler`, `spider`, `preview`)
 *
 * What we don't try to catch:
 *   - Headless browsers used by accessibility tools or screen readers —
 *     they should follow real-user intent
 *   - Custom curl/wget calls that don't identify themselves — assumed
 *     intentional
 */

const LINK_PREVIEW_UA_PATTERN =
	/(whatsapp|facebookexternalhit|meta-externalagent|telegrambot|slackbot|linkedinbot|twitterbot|discordbot|skypeuripreview|preview|crawler|spider|fetcher|\bbot[/ ])/i

/**
 * `true` when the request looks like a link-preview crawler. Callers should
 * treat such requests as read-only and skip any state-mutating work.
 */
export function isLinkPreviewUserAgent(
	userAgent: string | null | undefined,
): boolean {
	if (!userAgent) return false
	return LINK_PREVIEW_UA_PATTERN.test(userAgent)
}
