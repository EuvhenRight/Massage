/**
 * Confirm-action gate page. The `/api/booking/confirm` GET handler redirects
 * here; the actual transition fires only when this page's form POSTs back
 * to that same route. That gate kills link-preview auto-confirm regardless
 * of how the bot identifies itself — POST is required, full stop.
 *
 * Slovak-only by product decision (no language switch on action pages).
 */

import type { Metadata } from 'next'
import { Timestamp } from 'firebase/firestore'
import BookingActionPrompt, {
	type BookingActionPromptSummary,
} from '@/components/BookingActionPrompt'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { readBookingStatus } from '@/lib/booking-status'
import { formatDate, formatTime } from '@/lib/format-date'

export const metadata: Metadata = {
	title: 'V2studio — Potvrdiť rezerváciu',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{ t?: string }>

const SK = {
	title: 'Potvrďte svoju rezerváciu',
	body: 'Kliknutím nižšie potvrdíte, že prídete na termín. Ďakujeme!',
	alreadyTitle: 'Rezervácia je už potvrdená',
	alreadyBody:
		'Túto rezerváciu sme už evidovali ako potvrdenú. Tešíme sa na Vašu návštevu.',
	cancelledTitle: 'Rezerváciu sme nenašli',
	cancelledBody:
		'Táto rezervácia bola medzitým zrušená alebo dokončená. Ak si želáte rezervovať nový termín, kontaktujte nás.',
	tokenErrTitle: 'Odkaz vypršal',
	tokenErrBody:
		'Tento odkaz je neplatný alebo už vypršal. Ak potrebujete potvrdiť rezerváciu, kontaktujte nás prosím priamo.',
	missingTitle: 'Rezerváciu sme nenašli',
	missingBody:
		'Vašu rezerváciu sme v systéme nenašli. Možno bola už zrušená. Ak máte otázky, ozvite sa nám.',
	summaryHeading: 'Detaily rezervácie',
	summaryService: 'Služba',
	summaryDate: 'Dátum',
	summaryTime: 'Čas',
	summaryLocation: 'Miesto',
	submitButton: 'Áno, prídem — potvrdiť',
	backButton: 'Späť na úvod',
	needHelp: 'Potrebujete pomoc? Kontaktujte nás:',
} as const

export default async function ConfirmActionPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const params = await searchParams
	const token = params.t ?? ''
	const verified = token ? verifyActionToken(token) : null

	if (!verified) {
		return (
			<BookingActionPrompt
				variant='error'
				title={SK.tokenErrTitle}
				body={SK.tokenErrBody}
				labels={{
					submit: SK.submitButton,
					back: SK.backButton,
					needHelp: SK.needHelp,
				}}
				homeHref='/sk'
			/>
		)
	}

	const appointment = await getAppointment(verified.appointmentId)
	if (!appointment) {
		return (
			<BookingActionPrompt
				variant='error'
				title={SK.missingTitle}
				body={SK.missingBody}
				labels={{
					submit: SK.submitButton,
					back: SK.backButton,
					needHelp: SK.needHelp,
				}}
				homeHref='/sk'
			/>
		)
	}

	const status = readBookingStatus(
		appointment as unknown as Record<string, unknown>,
	)

	// Terminal states get a read-only acknowledgement — no submit button.
	if (status === 'cancelled' || status === 'completed' || status === 'no_show') {
		return (
			<BookingActionPrompt
				variant='error'
				title={SK.cancelledTitle}
				body={SK.cancelledBody}
				labels={{
					submit: SK.submitButton,
					back: SK.backButton,
					needHelp: SK.needHelp,
				}}
				homeHref='/sk'
			/>
		)
	}

	// Already confirmed — acknowledge politely, keep the submit button hidden
	// so re-clicking doesn't re-fire the staff notification.
	if (status === 'confirmed') {
		return (
			<BookingActionPrompt
				variant='confirm'
				title={SK.alreadyTitle}
				body={SK.alreadyBody}
				labels={{
					submit: SK.submitButton,
					back: SK.backButton,
					needHelp: SK.needHelp,
				}}
				homeHref='/sk'
			/>
		)
	}

	const start =
		appointment.startTime instanceof Date
			? appointment.startTime
			: (appointment.startTime as Timestamp).toDate()
	const summary: BookingActionPromptSummary = {
		service: appointment.service || '—',
		date: formatDate(start, { locale: 'sk' }),
		time: formatTime(start, { locale: 'sk' }),
	}

	return (
		<BookingActionPrompt
			variant='confirm'
			title={SK.title}
			body={SK.body}
			summary={summary}
			summaryLabels={{
				heading: SK.summaryHeading,
				service: SK.summaryService,
				date: SK.summaryDate,
				time: SK.summaryTime,
				location: SK.summaryLocation,
			}}
			labels={{
				submit: SK.submitButton,
				back: SK.backButton,
				needHelp: SK.needHelp,
			}}
			formAction='/api/booking/confirm'
			formFields={{ t: token }}
			homeHref='/sk'
		/>
	)
}
