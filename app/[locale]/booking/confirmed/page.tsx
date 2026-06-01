/**
 * Post-confirmation landing page. The route handler at `/api/booking/confirm`
 * redirects here after running the booking status transition; the only
 * server-side work left is fetching the appointment for the summary card
 * (the `id` URL param is set by the route handler after a successful
 * transition — i.e. the customer already passed the token check).
 *
 * For error/missing/token-invalid states the route handler appends an `err=…`
 * param and we render a neutral fallback. The page never re-runs the token
 * verification — that already happened at the handler.
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Timestamp } from 'firebase/firestore'
import BookingActionLanding, {
	type BookingActionLandingSummary,
} from '@/components/BookingActionLanding'
import { getAppointment } from '@/lib/book-appointment'
import { formatDate, formatTime } from '@/lib/format-date'
import type { Place } from '@/lib/places'

export const metadata: Metadata = {
	title: 'V2studio',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{
	ok?: string
	err?: string
	id?: string
}>

type Copy = { title: string; body: string; showSummary: boolean }

async function resolveCopy(
	locale: string,
	ok: string | undefined,
	err: string | undefined,
): Promise<Copy> {
	const t = await getTranslations({ locale, namespace: 'bookingLanding' })
	if (err === 'token') {
		return {
			title: t('tokenErrTitleConfirm'),
			body: t('tokenErrBodyConfirm'),
			showSummary: false,
		}
	}
	if (err === 'missing') {
		return {
			title: t('missingTitle'),
			body: t('missingBody'),
			showSummary: false,
		}
	}
	if (ok === '1') {
		return {
			title: t('confirmedTitle'),
			body: t('confirmedBody'),
			showSummary: true,
		}
	}
	return {
		title: t('confirmedAlreadyTitle'),
		body: t('confirmedAlreadyBody'),
		showSummary: false,
	}
}

/**
 * Best-effort summary load. A failure here (Firestore hiccup, missing doc)
 * just collapses the summary card — the success message above it still
 * renders, so the customer always gets feedback even if the read fails.
 */
async function loadSummary(
	id: string | undefined,
	locale: string,
): Promise<{ summary: BookingActionLandingSummary | null; place: Place | null }> {
	if (!id) return { summary: null, place: null }
	try {
		const appointment = await getAppointment(id)
		if (!appointment) return { summary: null, place: null }
		const start =
			appointment.startTime instanceof Date
				? appointment.startTime
				: (appointment.startTime as Timestamp).toDate()
		return {
			summary: {
				service: appointment.service || '—',
				date: formatDate(start, { locale }),
				time: formatTime(start, { locale }),
			},
			place: appointment.place ?? null,
		}
	} catch (e) {
		console.error('[booking/confirmed] summary load failed', e)
		return { summary: null, place: null }
	}
}

export default async function BookingConfirmedPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>
	searchParams: SearchParams
}) {
	const { locale } = await params
	const { ok, err, id } = await searchParams
	const [copy, t, summaryRes] = await Promise.all([
		resolveCopy(locale, ok, err),
		getTranslations({ locale, namespace: 'bookingLanding' }),
		loadSummary(id, locale),
	])

	const summary = copy.showSummary ? summaryRes.summary : null
	const place = summaryRes.place ?? 'massage'

	return (
		<BookingActionLanding
			variant={err ? 'error' : 'confirmed'}
			title={copy.title}
			body={copy.body}
			summary={summary}
			summaryLabels={
				summary
					? {
							heading: t('summaryHeading'),
							service: t('summaryService'),
							date: t('summaryDate'),
							time: t('summaryTime'),
							location: t('summaryLocation'),
						}
					: undefined
			}
			actionLabels={{
				backHome: t('actionBackHome'),
				bookAnother: t('actionBookAnother'),
				getDirections: t('actionGetDirections'),
				needHelp: t('needHelp'),
			}}
			homeHref={`/${locale}`}
			bookAnotherHref={`/${locale}/${place}/booking`}
		/>
	)
}
