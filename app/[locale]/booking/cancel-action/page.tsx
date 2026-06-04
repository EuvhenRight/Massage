/**
 * Cancel-action gate page — twin of confirm-action. The `/api/booking/cancel`
 * GET handler redirects here; the transition fires only when this page's
 * form POSTs back. See `confirm-action/page.tsx` for the full rationale.
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
	title: 'V2studio — Zrušiť rezerváciu',
	robots: { index: false, follow: false },
}

type SearchParams = Promise<{ t?: string }>

const SK = {
	title: 'Naozaj chcete zrušiť rezerváciu?',
	body: 'Kliknutím nižšie potvrdíte zrušenie tohto termínu. Termín sa uvoľní pre iného klienta.',
	alreadyTitle: 'Rezervácia bola už zrušená',
	alreadyBody:
		'Túto rezerváciu sme v systéme nenašli — pravdepodobne bola zrušená skôr.',
	completedTitle: 'Termín už prebehol',
	completedBody:
		'Tento termín sa už uskutočnil alebo bol uzavretý. Ak máte otázky, ozvite sa nám.',
	tokenErrTitle: 'Odkaz vypršal',
	tokenErrBody:
		'Tento odkaz je neplatný alebo už vypršal. Ak chcete rezerváciu zrušiť, kontaktujte nás priamo.',
	missingTitle: 'Rezerváciu sme nenašli',
	missingBody:
		'Vašu rezerváciu sme v systéme nenašli. Možno bola už zrušená. Ak máte otázky, ozvite sa nám.',
	summaryHeading: 'Detaily rezervácie',
	summaryService: 'Služba',
	summaryDate: 'Dátum',
	summaryTime: 'Čas',
	summaryLocation: 'Miesto',
	submitButton: 'Áno, zrušiť rezerváciu',
	backButton: 'Späť na úvod',
	needHelp: 'Máte otázku? Kontaktujte nás:',
} as const

export default async function CancelActionPage({
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

	if (status === 'cancelled') {
		return (
			<BookingActionPrompt
				variant='error'
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

	if (status === 'completed' || status === 'no_show') {
		return (
			<BookingActionPrompt
				variant='error'
				title={SK.completedTitle}
				body={SK.completedBody}
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
			variant='cancel'
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
			formAction='/api/booking/cancel'
			formFields={{ t: token }}
			homeHref='/sk'
		/>
	)
}
