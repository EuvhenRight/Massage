/**
 * Delete all documents in the Firestore `appointments` collection.
 *
 * Requires the same env as the app (.env.local with NEXT_PUBLIC_FIREBASE_*).
 * Must match your Firestore security rules (same constraints as test:crud).
 *
 * Usage:
 *   npm run delete-appointments -- --dry-run
 *   npm run delete-appointments -- --confirm
 *   npm run delete-appointments -- --confirm --place=massage
 *   npm run delete-appointments -- --confirm --place=depilation
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

function parseArgs(argv: string[]) {
	const dryRun = argv.includes('--dry-run')
	const confirm = argv.includes('--confirm')
	let place: string | null = null
	for (const a of argv) {
		if (a.startsWith('--place=')) {
			place = a.slice('--place='.length).trim() || null
		}
	}
	return { dryRun, confirm, place }
}

async function main() {
	const { dryRun, confirm, place } = parseArgs(process.argv.slice(2))

	if (!dryRun && !confirm) {
		console.error(
			'Refusing to delete: pass --dry-run to only count, or --confirm to delete.',
		)
		console.error('')
		console.error('  npm run delete-appointments -- --dry-run')
		console.error('  npm run delete-appointments -- --confirm')
		console.error(
			'  npm run delete-appointments -- --confirm --place=massage',
		)
		process.exit(1)
	}

	if (
		place &&
		place !== 'massage' &&
		place !== 'depilation'
	) {
		console.error(
			'--place must be massage or depilation (or omit for all places).',
		)
		process.exit(1)
	}

	const col = collection(db, 'appointments')
	const q =
		place === 'massage' || place === 'depilation'
			? query(col, where('place', '==', place))
			: col

	const snap = await getDocs(q)
	const refs: DocumentReference[] = snap.docs.map(d => d.ref)

	const scope =
		place === 'massage' || place === 'depilation'
			? `place=${place}`
			: 'all places'
	console.log(`Found ${refs.length} appointment document(s) (${scope}).`)

	if (dryRun) {
		console.log('Dry run — no documents deleted.')
		process.exit(0)
	}

	for (let i = 0; i < refs.length; i += BATCH_MAX) {
		const chunk = refs.slice(i, i + BATCH_MAX)
		const batch = writeBatch(db)
		for (const ref of chunk) {
			batch.delete(ref)
		}
		await batch.commit()
		console.log(
			`Deleted ${Math.min(i + chunk.length, refs.length)} / ${refs.length}`,
		)
	}

	console.log('Done.')
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
