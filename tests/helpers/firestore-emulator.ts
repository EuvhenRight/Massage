/**
 * Firestore emulator helper for integration tests.
 *
 * Usage:
 *
 *   // 1) Start the emulator in a separate terminal:
 *   //    npm run emulators
 *   //
 *   //    …or run the whole test suite under it:
 *   //    npm run emulators:exec -- 'vitest run'
 *
 *   import { initEmulatorFirestore, wipeFirestore } from 'tests/helpers/firestore-emulator'
 *   import { beforeEach } from 'vitest'
 *
 *   const db = initEmulatorFirestore()
 *   beforeEach(() => wipeFirestore())   // start every test with an empty DB
 *
 * Why a dedicated helper:
 *   1. The app's `lib/firebase.ts` reads NEXT_PUBLIC_* env vars at import-
 *      time. That's fine in dev, but it ties us to a single project — tests
 *      need a deterministic dummy project that NEVER hits production.
 *   2. We need to call `connectFirestoreEmulator(...)` *before* the first
 *      Firestore op. Doing it inside the SUT (`lib/firebase.ts`) couples the
 *      app code to test concerns.
 *
 * Side-effects:
 *   - First call to `initEmulatorFirestore()` initialises a Firebase app
 *     named "test" and points its Firestore client at the emulator.
 *   - Subsequent calls return the same client.
 */

import {
	deleteApp,
	getApp,
	getApps,
	initializeApp,
	type FirebaseApp,
} from 'firebase/app'
import {
	collection,
	connectFirestoreEmulator,
	deleteDoc,
	getDocs,
	getFirestore,
	type Firestore,
} from 'firebase/firestore'

const TEST_APP_NAME = 'test'
const DEFAULT_EMULATOR_HOST = '127.0.0.1'
const DEFAULT_EMULATOR_PORT = 8080

/**
 * Resolve the project ID actually being used by the app under test. The
 * production `lib/firebase.ts` reads `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
 * at import-time, and `tests/setup.ts` forces it to "luxe-salon-test"
 * while the emulator is up. We read the same env var so the SDK writes
 * and our REST-level clear hit the SAME namespace inside the emulator.
 */
function projectId(): string {
	return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'luxe-salon-test'
}

let cachedDb: Firestore | null = null

function getOrCreateApp(): FirebaseApp {
	const existing = getApps().find(a => a.name === TEST_APP_NAME)
	if (existing) return existing
	const id = projectId()
	return initializeApp(
		{
			apiKey: 'test-api-key',
			authDomain: `${id}.firebaseapp.com`,
			projectId: id,
			storageBucket: `${id}.appspot.com`,
			messagingSenderId: '000000000000',
			appId: '1:000000000000:web:0000000000000000000000',
		},
		TEST_APP_NAME,
	)
}

export function initEmulatorFirestore(): Firestore {
	if (cachedDb) return cachedDb
	const app = getOrCreateApp()
	const db = getFirestore(app)
	const host =
		process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? DEFAULT_EMULATOR_HOST
	const port = Number(
		process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? DEFAULT_EMULATOR_PORT,
	)
	connectFirestoreEmulator(db, host, port)
	cachedDb = db
	return db
}

/**
 * Delete every document in the test project's Firestore. Run in `beforeEach`
 * to keep tests fully isolated. Uses the emulator-only REST clear-data
 * endpoint to avoid having to enumerate collections from app code.
 *
 * Targets the same project ID the production `lib/firebase.ts` initialises
 * with — see `projectId()` above. Mismatched IDs are the most common cause
 * of "state leaks between tests" because the SDK and the wipe call end up
 * scoped to different emulator namespaces.
 */
export async function wipeFirestore(): Promise<void> {
	const host =
		process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? DEFAULT_EMULATOR_HOST
	const port = Number(
		process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? DEFAULT_EMULATOR_PORT,
	)
	const id = projectId()
	const url = `http://${host}:${port}/emulator/v1/projects/${id}/databases/(default)/documents`
	const res = await fetch(url, { method: 'DELETE' })
	if (!res.ok && res.status !== 200) {
		if (res.status !== 404) {
			throw new Error(
				`Firestore emulator wipe failed: ${res.status} ${res.statusText} (project=${id})`,
			)
		}
	}
}

/** Bulk-delete a single collection — used by tests that don't want a full wipe. */
export async function clearCollection(name: string): Promise<void> {
	if (!cachedDb) initEmulatorFirestore()
	const snap = await getDocs(collection(cachedDb!, name))
	await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

/** Tear down the Firebase app — call once at the end of a suite if needed. */
export async function disposeEmulator(): Promise<void> {
	cachedDb = null
	try {
		await deleteApp(getApp(TEST_APP_NAME))
	} catch {
		/* already disposed */
	}
}
