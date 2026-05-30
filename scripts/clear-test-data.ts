/**
 * Bulk-delete test data from the Firestore project this `.env.local` is
 * pointed at. Supports three collections — choose any combination via flags.
 *
 *   - `appointments` (always paired with `days` so calendar slot mirrors
 *     don't survive as orphans)
 *   - `clients`
 *
 * Safety:
 *   - `--dry-run` lists counts without deleting anything.
 *   - `--confirm` is required for any actual delete — running with neither
 *     prints usage and exits non-zero.
 *   - `--place=massage|depilation` scopes appointment cleanup to one studio.
 *     `clients` aren't place-scoped (they're keyed by phone).
 *
 * Usage:
 *   npm run clear:test-data -- --dry-run
 *   npm run clear:test-data -- --confirm --bookings
 *   npm run clear:test-data -- --confirm --clients
 *   npm run clear:test-data -- --confirm --all
 *   npm run clear:test-data -- --confirm --all --place=depilation
 *
 * Connects through the same `.env.local` as the dev server. Verify that
 * NEXT_PUBLIC_FIREBASE_PROJECT_ID points at the project you intend to
 * clean — there is no undo.
 */
import './load-env'
import {
	collection,
	getDocs,
	query,
	where,
	writeBatch,
	type DocumentReference,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const BATCH_MAX = 450

interface CliArgs {
	dryRun: boolean
	confirm: boolean
	bookings: boolean
	clients: boolean
	all: boolean
	place: 'massage' | 'depilation' | null
}

function parseArgs(argv: string[]): CliArgs {
	const has = (name: string) => argv.includes(name)
	let place: CliArgs['place'] = null
	for (const a of argv) {
		if (a.startsWith('--place=')) {
			const v = a.slice('--place='.length).trim()
			if (v === 'massage' || v === 'depilation') place = v
		}
	}
	return {
		dryRun: has('--dry-run'),
		confirm: has('--confirm'),
		bookings: has('--bookings'),
		clients: has('--clients'),
		all: has('--all'),
		place,
	}
}

function usage(message?: string): never {
	if (message) console.error(`${message}\n`)
	console.error('Usage:')
	console.error('  npm run clear:test-data -- --dry-run                       # count only')
	console.error('  npm run clear:test-data -- --confirm --bookings            # appointments + days')
	console.error('  npm run clear:test-data -- --confirm --clients             # clients')
	console.error('  npm run clear:test-data -- --confirm --all                 # everything')
	console.error('  npm run clear:test-data -- --confirm --all --place=massage # scope bookings to one studio')
	process.exit(1)
}

async function listRefs(collectionName: string, place: CliArgs['place']): Promise<DocumentReference[]> {
	const col = collection(db, collectionName)
	if (place && collectionName === 'appointments') {
		const q = query(col, where('place', '==', place))
		const snap = await getDocs(q)
		return snap.docs.map(d => d.ref)
	}
	if (place && collectionName === 'days') {
		// `days/{place}_{date}` — the doc ID encodes the place.
		const snap = await getDocs(col)
		return snap.docs.filter(d => d.id.startsWith(`${place}_`)).map(d => d.ref)
	}
	const snap = await getDocs(col)
	return snap.docs.map(d => d.ref)
}

async function deleteRefs(refs: DocumentReference[], label: string): Promise<void> {
	for (let i = 0; i < refs.length; i += BATCH_MAX) {
		const chunk = refs.slice(i, i + BATCH_MAX)
		const batch = writeBatch(db)
		for (const ref of chunk) batch.delete(ref)
		await batch.commit()
		console.log(`  ${label}: ${Math.min(i + chunk.length, refs.length)} / ${refs.length}`)
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))

	if (!args.bookings && !args.clients && !args.all) {
		usage('Pick at least one of --bookings, --clients, or --all.')
	}
	if (!args.dryRun && !args.confirm) {
		usage('Refusing to delete: pass --dry-run to only count, or --confirm to delete.')
	}

	const doBookings = args.all || args.bookings
	const doClients = args.all || args.clients

	console.log(`Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
	console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'DELETE'}`)
	console.log(`Scope: ${args.place ? `place=${args.place}` : 'all places'}`)
	console.log('')

	let appointmentRefs: DocumentReference[] = []
	let dayRefs: DocumentReference[] = []
	let clientRefs: DocumentReference[] = []

	if (doBookings) {
		appointmentRefs = await listRefs('appointments', args.place)
		dayRefs = await listRefs('days', args.place)
		console.log(`appointments: ${appointmentRefs.length}`)
		console.log(`days (slot mirrors): ${dayRefs.length}`)
	}
	if (doClients) {
		clientRefs = await listRefs('clients', null)
		console.log(`clients: ${clientRefs.length}`)
	}

	if (args.dryRun) {
		console.log('\nDry run — nothing deleted.')
		process.exit(0)
	}

	console.log('')

	// Order: appointments → days → clients. Appointments first so the
	// derived `days` doc has no live reference left when we wipe it.
	if (doBookings) {
		await deleteRefs(appointmentRefs, 'appointments')
		await deleteRefs(dayRefs, 'days')
	}
	if (doClients) {
		await deleteRefs(clientRefs, 'clients')
	}

	console.log('\nDone.')
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
