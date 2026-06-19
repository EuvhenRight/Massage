/**
 * Global Vitest setup — runs once per worker.
 *
 *   1. Loads `.env.test.local` (falls back to `.env.local`) so unit tests
 *      see Twilio/Resend keys (the MSW server intercepts the calls anyway,
 *      but the SDKs need the keys to construct clients without throwing).
 *   2. Starts MSW request interceptor — every test file inherits the same
 *      handler set from `tests/mocks/server.ts`. Tests can override per-case
 *      via `server.use(...)`; handlers reset after each test.
 *   3. Wires `@testing-library/jest-dom` matchers for component tests.
 *
 * Firebase emulator host is read by the SDK at module import — set the env
 * before importing any `lib/clients-firestore` or `lib/book-appointment`.
 * The `npm run emulators:exec` script does that for you in one go.
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { config as loadDotenv } from 'dotenv'
import { server } from './mocks/server'

loadDotenv({ path: '.env.test.local' })
loadDotenv({ path: '.env.local' })

// Hard-coded fallbacks so Twilio/Resend SDK constructors never throw on init
// when the test process starts without a populated .env. The MSW server
// intercepts the actual HTTP calls, so these never leave the process.
process.env.TWILIO_ACCOUNT_SID ??= 'AC' + '0'.repeat(32)
process.env.TWILIO_AUTH_TOKEN ??= 'test-auth-token'
process.env.TWILIO_MESSAGING_SERVICE_SID ??= 'MG' + '0'.repeat(32)
process.env.ADMIN_WHATSAPP_PHONE ??= '+421900000000'
process.env.TWILIO_CONTENT_SID_BIRTHDAY ??= 'HXbirthdaytest'
process.env.TWILIO_CONTENT_SID_RE_ENGAGEMENT ??= 'HXreengagementtest'
process.env.TWILIO_CONTENT_SID_REMINDER_2D ??= 'HXreminder2dtest'
process.env.TWILIO_CONTENT_SID_REMINDER_1D ??= 'HXreminder1dtest'
process.env.TWILIO_CONTENT_SID_REMINDER_1D_CONFIRMED ??= 'HXreminder1dconfirmedtest'
process.env.TWILIO_CONTENT_SID_REMINDER_0D ??= 'HXreminder0dtest'
process.env.TWILIO_CONTENT_SID_REMINDER_0D_CONFIRMED ??= 'HXreminder0dconfirmedtest'
process.env.RESEND_API_KEY ??= 're_test_key'
process.env.RESEND_FROM_EMAIL ??= 'noreply@example.test'
process.env.ADMIN_EMAIL ??= 'admin@example.test'
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://test.v2studio.sk'
process.env.CRON_SECRET ??= 'test-cron-secret'
process.env.BOOKING_ACTION_SECRET ??=
	'test-action-secret-padded-to-32-chars-minimum-length'
process.env.RE_ENGAGEMENT_THRESHOLD_DAYS ??= '180'

// Firebase web SDK requires a non-empty config object to construct the app —
// the values don't have to be real because the emulator routing below makes
// every call hit localhost. Production code paths never see prod credentials
// during tests.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'test-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= 'luxe-salon-test.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= 'luxe-salon-test'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= 'luxe-salon-test.appspot.com'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= '000000000000'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??=
	'1:000000000000:web:0000000000000000000000'

// When the Firestore emulator is up, force the project ID to the test
// value — overriding whatever `.env.local` carries. Without this override,
// devs who have a production `NEXT_PUBLIC_FIREBASE_PROJECT_ID` see two
// project namespaces inside the emulator: the SDK writes to the prod ID,
// `wipeFirestore()` deletes the test ID, and state leaks across tests.
// The emulator is local-only so there is no risk of touching prod here.
if (process.env.FIRESTORE_EMULATOR_HOST) {
	process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'luxe-salon-test'
}

// Stable timezone for snapshot stability across CI environments.
process.env.TZ = 'Europe/Bratislava'

// Wire the production `lib/firebase` `db` singleton at the emulator when
// running under `firebase emulators:exec`. Web SDK has no auto-detection of
// FIRESTORE_EMULATOR_HOST (that's Admin SDK only), so we read it ourselves
// and call `connectFirestoreEmulator(...)` from `beforeAll` — by the time
// the first test runs, `lib/firebase.ts` has already evaluated its module
// body (env vars above are set before any test file imports it), and the
// `db` instance is ready to be re-pointed at the emulator. Wrapped in
// try/catch to tolerate Vitest's worker reuse, where the same module graph
// may have already connected on a previous run.
beforeAll(async () => {
	if (process.env.FIRESTORE_EMULATOR_HOST) {
		const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
		const [{ db }, { connectFirestoreEmulator }] = await Promise.all([
			import('@/lib/firebase'),
			import('firebase/firestore'),
		])
		try {
			connectFirestoreEmulator(db, host || '127.0.0.1', Number(portStr) || 8080)
		} catch {
			// Already connected — fine.
		}
	}
	// MSW must NOT intercept localhost traffic — that's how the Firestore
	// emulator + the `wipeFirestore()` helper REST DELETE talk to the
	// emulator process. Unhandled external calls (Twilio, Resend, anything
	// public) still throw, so a missing mock surfaces immediately.
	server.listen({
		onUnhandledRequest: (request, print) => {
			const url = new URL(request.url)
			if (
				url.hostname === '127.0.0.1' ||
				url.hostname === 'localhost' ||
				url.hostname === '::1'
			) {
				return
			}
			print.error()
		},
	})
})

afterEach(() => {
	server.resetHandlers()
	vi.clearAllMocks()
})

afterAll(() => {
	server.close()
})
