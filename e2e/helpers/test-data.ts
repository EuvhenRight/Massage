/**
 * Test data generators for E2E specs that write to a shared Firebase project.
 *
 * Production data and E2E data co-exist in the same Firestore — we don't run
 * a separate emulator behind the Playwright dev server (yet). Each spec must
 * therefore make its writes uniquely identifiable so:
 *
 *   1. Tests never collide with each other or with prod data,
 *   2. A human can grep "+421900E2E…" in the Firebase Console to spot
 *      leftover test rows, and
 *   3. Cleanup (manual or automated) can target only test phones.
 *
 * The phone always starts with `+421900` (Slovak premium-rate placeholder
 * range that is never assigned to real subscribers) followed by 6 digits
 * derived from `Date.now()`. Both halves combined fit inside E.164 length.
 */

/** Phone number in E.164 form, unique per call. */
export function uniqueTestPhone(): string {
	// Last 6 digits of the timestamp give us about 11.5 days of uniqueness
	// before the cycle repeats — plenty for a single test run.
	const suffix = String(Date.now()).slice(-6)
	return `+421900${suffix}`
}

/** Display name with the same prefix so admins can spot test rows in the UI. */
export function uniqueTestName(prefix = 'E2E'): string {
	return `${prefix} ${Date.now().toString(36).slice(-5)}`
}

/** Stable e-mail tied to the same uniqueness root. */
export function uniqueTestEmail(): string {
	return `e2e+${Date.now().toString(36)}@example.test`
}
