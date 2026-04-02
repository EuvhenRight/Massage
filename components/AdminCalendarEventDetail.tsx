'use client'

import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { AppointmentData } from '@/lib/book-appointment'
import { formatDate, formatTime } from '@/lib/format-date'
import type { Place } from '@/lib/places'
import {
	findServiceDataForAppointment,
	resolveAppointmentRequiredFullDayCount,
	type ServiceData,
} from '@/lib/services'
import {
	DEFAULT_SECTION_CALENDAR_COLOR,
	resolvedOpaqueCalendarSlotFill,
} from '@/lib/section-calendar-colors'
import { cn } from '@/lib/utils'
import { Copy, Pencil, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

/** Left accent bar: never transparent (catalog may use bg-transparent + border only). */
function colorStripClass(
	services: ServiceData[],
	appointment: Pick<AppointmentData, 'service' | 'serviceId'>,
): string {
	const s = findServiceDataForAppointment(appointment, services)
	const raw = s?.color ?? ''
	const filled = resolvedOpaqueCalendarSlotFill(
		raw,
		DEFAULT_SECTION_CALENDAR_COLOR,
	)
	const token = filled.split(/\s+/).find(c => c.startsWith('bg-'))
	return token ?? 'bg-slate-600'
}

interface AdminCalendarEventDetailProps {
	appointment: AppointmentData
	services: ServiceData[]
	place: Place
	readOnly?: boolean
	onClose: () => void
	onEdit: (a: AppointmentData) => void
	onRequestCancel: (a: AppointmentData) => void
}

export default function AdminCalendarEventDetail({
	appointment,
	services,
	place,
	readOnly = false,
	onClose,
	onEdit,
	onRequestCancel,
}: AdminCalendarEventDetailProps) {
	const locale = useLocale()
	const t = useTranslations('admin')
	const ui = useMemo(() => getPlaceAccentUi(place), [place])

	const startDate =
		appointment.startTime && 'toDate' in appointment.startTime
			? appointment.startTime.toDate()
			: new Date(appointment.startTime as Date)
	const endDate =
		appointment.endTime && 'toDate' in appointment.endTime
			? appointment.endTime.toDate()
			: new Date(appointment.endTime as Date)

	const isTbd = appointment.scheduleTbd === true
	const isFullDay = appointment.adminBookingMode === 'day'
	const catalogForApt = useMemo(
		() => findServiceDataForAppointment(appointment, services),
		[appointment, services],
	)
	const fullDayCount = resolveAppointmentRequiredFullDayCount(
		appointment,
		catalogForApt,
	)

	const durationMinutes = Math.round(
		(endDate.getTime() - startDate.getTime()) / 60000,
	)

	const dateHeading = startDate.toLocaleDateString(locale, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})

	const timeHeading = isTbd
		? t('listTbdNoTimeYet')
		: isFullDay
			? `${t('allDayNoClockTime')} · ${t('dayCountValue', { count: fullDayCount })}`
			: `${formatTime(startDate, { locale })} – ${formatTime(endDate, { locale })}`

	const strip = colorStripClass(services, appointment)

	const handleCopy = () => {
		const dateStr = formatDate(startDate, { locale })
		const endDateStr = formatDate(endDate, { locale })
		const timeStr = isTbd
			? t('listTbdNoTimeYet')
			: isFullDay
				? `${t('allDayNoClockTime')} · ${t('dayCountValue', { count: fullDayCount })}${fullDayCount > 1 ? ` (${dateStr} – ${endDateStr})` : ` (${dateStr})`}`
				: `${formatTime(startDate, { locale })} – ${formatTime(endDate, { locale })}`
		const text = [
			appointment.service,
			appointment.fullName || '—',
			appointment.email || '—',
			appointment.phone || '—',
			isTbd ? timeStr : isFullDay ? timeStr : `${dateStr} · ${timeStr}`,
			...(appointment.adminNote?.trim() ? [appointment.adminNote.trim()] : []),
		].join('\n')
		navigator.clipboard.writeText(text).then(
			() => toast.success(t('copyDetails')),
			() => toast.error(t('copyFailed')),
		)
	}

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [onClose])

	if (typeof document === 'undefined') return null

	return createPortal(
		<>
			<button
				type='button'
				className='fixed inset-0 z-[70] bg-nearBlack/70 backdrop-blur-[2px]'
				aria-label={t('close')}
				onClick={onClose}
			/>
			<div
				className='fixed left-1/2 top-1/2 z-[71] w-[calc(100%-1.5rem)] max-w-md max-h-[min(88dvh,calc(100vh-1rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-nearBlack p-5 shadow-2xl shadow-black/60'
				role='dialog'
				aria-modal='true'
				aria-labelledby='admin-cal-event-detail-title'
			>
				<div className='mb-2 flex items-center justify-end gap-0.5'>
						<button
							type='button'
							onClick={handleCopy}
							className='rounded-lg p-2 text-icyWhite/70 transition-colors hover:bg-white/10 hover:text-icyWhite'
							aria-label={t('copyAria')}
						>
							<Copy className='h-4 w-4' />
						</button>
						{!readOnly ? (
							<button
								type='button'
								onClick={() => {
									onClose()
									onEdit(appointment)
								}}
								className='rounded-lg p-2 text-icyWhite/70 transition-colors hover:bg-white/10 hover:text-icyWhite'
								aria-label={t('editAria')}
							>
								<Pencil className='h-4 w-4' />
							</button>
						) : null}
						<button
							type='button'
							onClick={onClose}
							className='rounded-full p-2 text-icyWhite/60 transition-colors hover:bg-white/10 hover:text-icyWhite'
							aria-label={t('close')}
						>
							<X className='h-5 w-5' />
						</button>
				</div>

				<div className='flex gap-3'>
					<div
						className={cn('w-1 shrink-0 self-stretch min-h-[4rem] rounded-full', strip)}
						aria-hidden
					/>
					<div className='min-w-0 flex-1 space-y-3'>
						<div>
							<h2
								id='admin-cal-event-detail-title'
								className='font-serif text-lg leading-snug text-icyWhite sm:text-xl'
							>
								{appointment.service?.trim() || '—'}
							</h2>
							<p className='mt-1.5 text-sm leading-relaxed text-icyWhite/75'>
								{dateHeading}
								<span className='text-icyWhite/40'> · </span>
								{timeHeading}
								{!isTbd && !isFullDay && durationMinutes > 0 ? (
									<span className='text-icyWhite/45'> ({durationMinutes} min)</span>
								) : null}
							</p>
						</div>

						<div className='space-y-1.5 border-t border-white/10 pt-3 text-sm'>
							<p className='text-icyWhite/90'>
								<span className='text-icyWhite/45'>{t('customer')}: </span>
								{appointment.fullName?.trim() || '—'}
							</p>
							{appointment.email?.trim() ? (
								<p className='truncate text-icyWhite/75'>
									<span className='text-icyWhite/45'>{t('emailHeader')}: </span>
									{appointment.email}
								</p>
							) : null}
							{appointment.phone?.trim() ? (
								<p className='text-icyWhite/75'>
									<span className='text-icyWhite/45'>{t('phoneHeader')}: </span>
									{appointment.phone}
								</p>
							) : null}
						</div>

						{appointment.adminNote?.trim() ? (
							<div className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs italic text-icyWhite/65 whitespace-pre-wrap'>
								{appointment.adminNote.trim()}
							</div>
						) : null}

						<div className='flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end'>
							<button
								type='button'
								onClick={onClose}
								className='min-h-11 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-icyWhite/90 hover:bg-white/5 sm:min-h-0 sm:py-2'
							>
								{t('close')}
							</button>
							{!readOnly ? (
								<>
									<button
										type='button'
										onClick={() => onRequestCancel(appointment)}
										className='min-h-11 rounded-lg border border-red-400/35 bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/25 sm:min-h-0 sm:py-2'
										aria-label={t('cancelAria')}
									>
										{t('cancel')}
									</button>
									<button
										type='button'
										onClick={() => {
											onClose()
											onEdit(appointment)
										}}
										className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-medium sm:min-h-0 sm:py-2 ${ui.btnPrimarySm}`}
									>
										{t('editAppointment')}
									</button>
								</>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</>,
		document.body,
	)
}
