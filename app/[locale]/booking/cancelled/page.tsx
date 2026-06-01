/**
 * Post-cancellation landing page. Reaches this URL after the customer clicks
 * the cancel link in a WhatsApp reminder; the route handler at
 * `/api/booking/cancel` has already soft-cancelled the appointment and fired
 * the notifications by the time we render here.
 *
 * `?ok=1`        — first-time cancellation (shows the variant message).
 * `?ok=already`  — re-click on a link that was already cancelled (we don't
 *                  re-fire notifications and the page acknowledges the prior
 *                  state).
 * `?err=token`   — invalid / expired signed token.
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import BookingActionLanding from '@/components/BookingActionLanding'

export const metadata: Metadata = {
	title: 'V2studio',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{ ok?: string; err?: string; id?: string }>

type Copy = { title: string; body: string }

async function resolveCopy(
	locale: string,
	ok: string | undefined,
	err: string | undefined,
): Promise<Copy> {
	const t = await getTranslations({ locale, namespace: 'bookingLanding' })
	if (err === 'token') {
		return {
			title: t('tokenErrTitleCancel'),
			body: t('tokenErrBodyCancel'),
		}
	}
	if (ok === 'already') {
		return {
			title: t('cancelledAlreadyTitle'),
			body: t('cancelledAlreadyBody'),
		}
	}
	return {
		title: t('cancelledTitle'),
		body: t('cancelledBody'),
	}
}

export default async function BookingCancelledPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>
	searchParams: SearchParams
}) {
	const { locale } = await params
	const { ok, err } = await searchParams
	const [copy, t] = await Promise.all([
		resolveCopy(locale, ok, err),
		getTranslations({ locale, namespace: 'bookingLanding' }),
	])

	return (
		<BookingActionLanding
			variant={err ? 'error' : 'cancelled'}
			title={copy.title}
			body={copy.body}
			actionLabels={{
				backHome: t('actionBackHome'),
				bookAnother: t('actionBookAnother'),
				getDirections: t('actionGetDirections'),
				needHelp: t('needHelp'),
			}}
			homeHref={`/${locale}`}
			bookAnotherHref={`/${locale}/massage/booking`}
		/>
	)
}
