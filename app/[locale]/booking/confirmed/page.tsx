/**
 * Post-confirmation landing page. Slovak only — by product decision, the
 * confirmation/cancellation flow doesn't offer a language switch; whichever
 * locale the customer's site session is in, this page always shows the
 * salon's Slovak copy. The `[locale]` segment is kept so the existing URLs
 * minted by the route handler (`/booking/confirmed`) keep working through
 * next-intl's middleware redirect.
 *
 * The route handler at `/api/booking/confirm` redirects here after running
 * the booking-status transition and (when the URL carries `?id=`) we do a
 * best-effort summary load to render the appointment details card.
 */

import type { Metadata } from 'next'
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
	preview?: string
}>

const SK = {
	confirmedTitle: 'Ďakujeme za potvrdenie',
	confirmedBody: 'Tešíme sa na Vašu návštevu.',
	confirmedAlreadyTitle: 'Rezervácia je potvrdená',
	confirmedAlreadyBody:
		'Túto rezerváciu sme už evidovali ako potvrdenú. Tešíme sa na Vašu návštevu.',
	tokenErrTitle: 'Odkaz vypršal',
	tokenErrBody:
		'Tento odkaz je neplatný alebo už vypršal. Ak potrebujete potvrdiť rezerváciu, kontaktujte nás prosím priamo.',
	missingTitle: 'Rezerváciu sme nenašli',
	missingBody:
		'Vašu rezerváciu sme v systéme nenašli. Možno bola už zrušená. Ak máte otázky, ozvite sa nám.',
	previewTitle: 'Potvrdenie rezervácie',
	previewBody:
		'Otvorte odkaz na svojom telefóne, aby ste potvrdili rezerváciu.',
	summaryHeading: 'Detaily rezervácie',
	summaryService: 'Služba',
	summaryDate: 'Dátum',
	summaryTime: 'Čas',
	summaryLocation: 'Miesto',
	actionBackHome: 'Späť na úvod',
	actionBookAnother: 'Rezervovať ďalší termín',
	actionGetDirections: 'Zobraziť na mape',
	needHelp: 'Potrebujete zmenu? Kontaktujte nás:',
} as const

type Copy = { title: string; body: string; showSummary: boolean }

function resolveCopy(
	ok: string | undefined,
	err: string | undefined,
	preview: string | undefined,
): Copy {
	if (preview === '1') {
		return {
			title: SK.previewTitle,
			body: SK.previewBody,
			showSummary: false,
		}
	}
	if (err === 'token') {
		return {
			title: SK.tokenErrTitle,
			body: SK.tokenErrBody,
			showSummary: false,
		}
	}
	if (err === 'missing') {
		return {
			title: SK.missingTitle,
			body: SK.missingBody,
			showSummary: false,
		}
	}
	if (ok === '1') {
		return {
			title: SK.confirmedTitle,
			body: SK.confirmedBody,
			showSummary: true,
		}
	}
	return {
		title: SK.confirmedAlreadyTitle,
		body: SK.confirmedAlreadyBody,
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
				date: formatDate(start, { locale: 'sk' }),
				time: formatTime(start, { locale: 'sk' }),
			},
			place: appointment.place ?? null,
		}
	} catch (e) {
		console.error('[booking/confirmed] summary load failed', e)
		return { summary: null, place: null }
	}
}

export default async function BookingConfirmedPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const { ok, err, id, preview } = await searchParams
	const copy = resolveCopy(ok, err, preview)
	const summaryRes = await loadSummary(id)

	const summary = copy.showSummary ? summaryRes.summary : null
	const place = summaryRes.place ?? 'massage'

	return (
		<BookingActionLanding
			variant={err || preview ? 'error' : 'confirmed'}
			title={copy.title}
			body={copy.body}
			summary={summary}
			summaryLabels={
				summary
					? {
							heading: SK.summaryHeading,
							service: SK.summaryService,
							date: SK.summaryDate,
							time: SK.summaryTime,
							location: SK.summaryLocation,
						}
					: undefined
			}
			actionLabels={{
				backHome: SK.actionBackHome,
				bookAnother: SK.actionBookAnother,
				getDirections: SK.actionGetDirections,
				needHelp: SK.needHelp,
			}}
			homeHref='/sk'
			bookAnotherHref={`/sk/${place}/booking`}
		/>
	)
}
