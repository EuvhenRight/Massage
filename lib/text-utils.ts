/**
 * Text truncation utilities for the booking flow.
 * Protects layout from overflow with long service names, paths, and customer data.
 */

/** Max character lengths for programmatic truncation (e.g. meta, alt text) */
export const TRUNCATE_LIMITS = {
	serviceName: 80,
	sectionTitle: 60,
	path: 70,
	fullName: 60,
	email: 50,
} as const

/**
 * Truncate string with ellipsis. Use for programmatic truncation (title attribute, etc.)
 * For visual truncation, prefer CSS `truncate` class + `title` for tooltip.
 */
export function truncateText(text: string, maxLength: number = 60): string {
	if (!text || text.length <= maxLength) return text
	return text.slice(0, maxLength - 1).trim() + '\u2026'
}
