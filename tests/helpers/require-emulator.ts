/**
 * Guard for integration tests that need the Firestore emulator.
 *
 * Vitest runs every spec under `tests/setup.ts`, but only the integration
 * tests need a live emulator. Calling `requireEmulator()` at the top of an
 * integration suite either:
 *
 *   - returns silently when `FIRESTORE_EMULATOR_HOST` is set (the
 *     `firebase emulators:exec` script does that automatically), or
 *   - skips the entire describe block when the emulator is not running,
 *     printing a hint instead of failing the suite.
 *
 * This keeps `npm test` green for unit-only contributors while still gating
 * the integration suite in CI (where the workflow always exec's under the
 * emulator).
 */

/** @returns true when the emulator host env var is set. */
export function emulatorAvailable(): boolean {
	return !!process.env.FIRESTORE_EMULATOR_HOST
}

/**
 * Throws a clear instructional error when the emulator is not running.
 * Prefer the skip pattern for friendlier local DX:
 *
 *   import { describe } from 'vitest'
 *   import { emulatorAvailable } from 'tests/helpers/require-emulator'
 *
 *   describe.skipIf(!emulatorAvailable())('clients-firestore (emulator)', () => {
 *     // …
 *   })
 */
export function requireEmulator(): void {
	if (!emulatorAvailable()) {
		throw new Error(
			'Firestore emulator is not running.\n' +
				'Start it with `npm run emulators` (in a separate terminal) or\n' +
				'run the suite under `npm run emulators:exec -- \\\'npm test\\\'`.',
		)
	}
}
