/**
 * Unit test for the Google-Calendar-style column packing used by the admin
 * week/day grid (concurrent bookings → side-by-side columns).
 *
 * Pure logic, no env / network. Run: npm run test:columns
 */
import { computeTimedColumnLayout } from '../lib/admin-calendar-grid-layout'

const DAY = '2026-05-30T'
const at = (hhmm: string) => new Date(`${DAY}${hhmm}:00`).getTime()

let failures = 0
function near(a: number, b: number) {
	return Math.abs(a - b) < 0.5
}
function check(
	label: string,
	got: { leftPct: number; widthPct: number } | undefined,
	leftPct: number,
	widthPct: number,
) {
	const ok = !!got && near(got.leftPct, leftPct) && near(got.widthPct, widthPct)
	if (!ok) failures++
	console.log(
		`${ok ? '✓' : '✗'} ${label} → left=${got?.leftPct?.toFixed(1)} width=${got?.widthPct?.toFixed(1)}` +
			(ok ? '' : ` (expected left=${leftPct} width=${widthPct})`),
	)
}

// 1. Single booking spans the full column.
const single = computeTimedColumnLayout(
	[{ id: 'a', startMs: at('10:00'), durationMinutes: 60 }],
	8,
	20,
)
console.log('\nSingle booking:')
check('a full width', single.get('a'), 0, 100)

// 2. Two overlapping bookings split 50 / 50.
const pair = computeTimedColumnLayout(
	[
		{ id: 'a', startMs: at('10:00'), durationMinutes: 60 },
		{ id: 'b', startMs: at('10:30'), durationMinutes: 60 },
	],
	8,
	20,
)
console.log('\nTwo overlapping:')
check('a left half', pair.get('a'), 0, 50)
check('b right half', pair.get('b'), 50, 50)

// 3. A (full hour) overlaps B (first half) and C (second half); B & C share the
//    right column. Three columns are NOT created — only two are needed.
const trio = computeTimedColumnLayout(
	[
		{ id: 'a', startMs: at('10:00'), durationMinutes: 60 },
		{ id: 'b', startMs: at('10:00'), durationMinutes: 30 },
		{ id: 'c', startMs: at('10:30'), durationMinutes: 30 },
	],
	8,
	20,
)
console.log('\nOne long + two stacked:')
check('a left half', trio.get('a'), 0, 50)
check('b right half (top)', trio.get('b'), 50, 50)
check('c right half (bottom)', trio.get('c'), 50, 50)

// 4. Back-to-back (no overlap) → separate clusters, each full width.
const seq = computeTimedColumnLayout(
	[
		{ id: 'a', startMs: at('10:00'), durationMinutes: 60 },
		{ id: 'b', startMs: at('11:00'), durationMinutes: 60 },
	],
	8,
	20,
)
console.log('\nBack-to-back:')
check('a full width', seq.get('a'), 0, 100)
check('b full width', seq.get('b'), 0, 100)

// 5. topPx / heightPx sanity (gridStart 8:00, 112px rows → 28px per 15 min).
console.log('\nGeometry:')
const geo = single.get('a')!
const topOk = near(geo.topPx, 224) // (10:00−8:00)=120min = 8 quarters × 28
const hOk = near(geo.heightPx, 110) // 60min = 4 quarters × 28 − 2
if (!topOk) failures++
if (!hOk) failures++
console.log(`${topOk ? '✓' : '✗'} top=${geo.topPx} (expected 224)`)
console.log(`${hOk ? '✓' : '✗'} height=${geo.heightPx} (expected 110)`)

if (failures > 0) {
	console.error(`\n${failures} test(s) failed.`)
	process.exit(1)
}
console.log('\nAll column-packing tests passed.')
