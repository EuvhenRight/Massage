/**
 * Post-cancellation landing page. Slovak only — see the matching note in
 * `confirmed/page.tsx` for rationale. The route handler at
 * `/api/booking/cancel` has already soft-cancelled the appointment and
 * fired the notifications by the time we render here.
 */

import type { Metadata } from 'next'
import BookingActionLanding from '@/components/BookingActionLanding'

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
	cancelledTitle: 'Rezervácia bola zrušená',
	cancelledBody: 'Vaša rezervácia bola úspešne zrušená. Ďakujeme, že ste nám dali vedieť.',
	cancelledAlreadyTitle: 'Rezervácia bola už zrušená',
	cancelledAlreadyBody:
		'Túto rezerváciu sme v systéme nenašli — pravdepodobne bola zrušená skôr.',
	tokenErrTitle: 'Odkaz vypršal',
	tokenErrBody:
		'Tento odkaz je neplatný alebo už vypršal. Ak chcete rezerváciu zrušiť, kontaktujte nás priamo.',
	previewTitle: 'Zrušenie rezervácie',
	previewBody:
		'Otvorte odkaz na svojom telefóne, aby ste zrušili rezerváciu.',
	actionBackHome: 'Späť na úvod',
	actionBookAnother: 'Rezervovať nový termín',
	actionGetDirections: 'Zobraziť na mape',
	needHelp: 'Máte otázku? Kontaktujte nás:',
} as const

type Copy = { title: string; body: string }

function resolveCopy(
	ok: string | undefined,
	err: string | undefined,
	preview: string | undefined,
): Copy {
	if (preview === '1') {
		return { title: SK.previewTitle, body: SK.previewBody }
	}
	if (err === 'token') {
		return { title: SK.tokenErrTitle, body: SK.tokenErrBody }
	}
	if (ok === 'already') {
		return {
			title: SK.cancelledAlreadyTitle,
			body: SK.cancelledAlreadyBody,
		}
	}
	return { title: SK.cancelledTitle, body: SK.cancelledBody }
}

export default async function BookingCancelledPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const { ok, err, preview } = await searchParams
	const copy = resolveCopy(ok, err, preview)

	return (
		<BookingActionLanding
			variant={err || preview ? 'error' : 'cancelled'}
			title={copy.title}
			body={copy.body}
			actionLabels={{
				backHome: SK.actionBackHome,
				bookAnother: SK.actionBookAnother,
				getDirections: SK.actionGetDirections,
				needHelp: SK.needHelp,
			}}
			homeHref='/sk'
			bookAnotherHref='/sk/massage/booking'
		/>
	)
}
