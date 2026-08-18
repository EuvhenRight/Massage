/**
 * Seeds the Firestore emulator with the fixed data the e2e suite reads.
 *
 * The suite used to run against the real project, which meant a browser test
 * could write into production and — when a run was interrupted — leave rows
 * behind. Under the emulator the database starts empty, so the working hours
 * and price catalog the specs depend on have to be put there first.
 *
 * Node-side only: the Firebase Node SDK auto-honours `FIRESTORE_EMULATOR_HOST`,
 * so importing `@/lib/firebase` here already talks to the emulator.
 */
import { saveSchedule } from '../../lib/schedule-firestore'
import { setPriceCatalog } from '../../lib/price-catalog-firestore'
import {
	getDepilationPriceCatalogExample,
	getMassagePriceCatalogExample,
} from '../../lib/price-catalog-seed'
import { normalizePriceCatalog } from '../../lib/price-catalog-normalize'
import { syncPriceCatalogToServices } from '../../lib/sync-price-catalog-to-services'
import type { Place } from '../../lib/places'
import type { ScheduleData } from '../../lib/schedule-firestore'

/** Mon–Fri 09:00–18:00, Sat 10:00–16:00, Sun closed, 15-minute prep buffer. */
const E2E_SCHEDULE: ScheduleData = {
	slotDurationMinutes: 30,
	prepBufferMinutes: 15,
	defaultSchedule: {
		0: null,
		1: { mode: 'window', open: '09:00', close: '18:00' },
		2: { mode: 'window', open: '09:00', close: '18:00' },
		3: { mode: 'window', open: '09:00', close: '18:00' },
		4: { mode: 'window', open: '09:00', close: '18:00' },
		5: { mode: 'window', open: '09:00', close: '18:00' },
		6: { mode: 'window', open: '10:00', close: '16:00' },
	},
} as ScheduleData

export function emulatorMode(): boolean {
	return !!process.env.FIRESTORE_EMULATOR_HOST
}

export async function seedEmulator(): Promise<void> {
	if (!emulatorMode()) return

	const places: Place[] = ['massage', 'depilation']
	for (const place of places) {
		await saveSchedule(E2E_SCHEDULE, place)

		const catalog = normalizePriceCatalog(
			place === 'massage'
				? getMassagePriceCatalogExample()
				: getDepilationPriceCatalogExample(),
		)
		await setPriceCatalog(place, catalog)
		// Admin calendar colours read the `services` mirror, same as production.
		await syncPriceCatalogToServices(place, catalog)
	}
}
