'use client'

import {
	adminCalendarBlockHeightPx,
	adminCalendarEffectiveSlotTier,
	adminCalendarMinDisplayHeightForTier,
	adminCalendarSlotTier,
	type AdminCalendarSlotTier,
} from '@/lib/admin-calendar-grid-layout'
import type { AppointmentData } from '@/lib/book-appointment'
import { formatTime as formatTimeUi } from '@/lib/format-date'
import { resolvedOpaqueCalendarSlotFill } from '@/lib/section-calendar-colors'
import {
	ADMIN_APPOINTMENT_FALLBACK_COLOR,
	findServiceDataForAppointment,
	resolveAppointmentRequiredFullDayCount,
	type ServiceData,
} from '@/lib/services'
import { readBookingStatus } from '@/lib/booking-status'
import { getBookingStatusUi } from '@/lib/booking-status-ui'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type React from 'react'
import { NotificationChannelBadge } from './NotificationChannelBadge'

const DEFAULT_COLOR = `${ADMIN_APPOINTMENT_FALLBACK_COLOR} text-icyWhite`

function getServiceColor(
	appointment: Pick<AppointmentData, 'service' | 'serviceId'>,
	services: ServiceData[],
): string {
	const s = findServiceDataForAppointment(appointment, services)
	if (s) {
		return `${resolvedOpaqueCalendarSlotFill(s.color, ADMIN_APPOINTMENT_FALLBACK_COLOR)} text-icyWhite`
	}
	return DEFAULT_COLOR
}

const PAST_COLOR = 'bg-gray-600 border-gray-500 text-icyWhite/80'

export interface PositionedCalendarLayout {
	topPx: number
	heightPx: number
	zIndex: number
	/** Column packing for concurrent bookings (Google-Calendar style). When set,
	 *  the block is placed by percentage width/left instead of full-width insets. */
	leftPct?: number
	widthPct?: number
}

interface DraggableAppointmentProps {
	appointment: AppointmentData
	disabled?: boolean
	/** Rendered under `DragOverlay`: no absolute grid positioning; fixed size for correct grab preview. */
	isDragOverlay?: boolean
	dragId?: string
	blockHeight?: number
	positionedCalendar?: PositionedCalendarLayout | null
	onOpenDetail?: () => void
	onEdit?: () => void
	onCancel?: () => void
	/** Pointer-down on the bottom resize handle (timed grid blocks only). */
	onResizeStart?: (e: React.PointerEvent) => void
	services?: ServiceData[]
	isPast?: boolean
	layout?: 'calendar' | 'list'
	/**
	 * TBD / full-day-without-days rows: muted transparent look in list (and drag overlay).
	 * Omit for blocks placed on the week grid so catalog section colors apply.
	 */
	awaitingCalendarAssignment?: boolean
}

function tierChrome(tier: AdminCalendarSlotTier): string {
	switch (tier) {
		case 'micro':
			return 'rounded-md border border-white/25 px-1.5 py-0.5 shadow-sm shadow-black/40'
		case 'compact':
			return 'rounded-md border border-white/20 px-2 py-1 shadow-sm shadow-black/35'
		case 'short':
			return 'rounded-lg border border-white/18 px-2 py-1.5 shadow-md shadow-black/30'
		case 'medium':
			return 'rounded-lg border border-white/15 px-2.5 py-1.5 shadow-md shadow-black/25 ring-1 ring-black/20'
		case 'full':
			return 'rounded-xl border border-white/12 px-3 py-2 shadow-lg shadow-black/30 ring-1 ring-black/25'
	}
}

export default function DraggableAppointment({
	appointment,
	disabled = false,
	isDragOverlay = false,
	dragId,
	blockHeight,
	positionedCalendar = null,
	onOpenDetail,
	onEdit,
	onCancel,
	onResizeStart,
	services = [],
	isPast = false,
	layout = 'calendar',
	awaitingCalendarAssignment = false,
}: DraggableAppointmentProps) {
	const locale = useLocale()
	const t = useTranslations('admin')

	const isTbd = appointment.scheduleTbd === true
	const isFullDay = appointment.adminBookingMode === 'day'

	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: isDragOverlay
				? `__drag-overlay__${appointment.id}`
				: (dragId ?? appointment.id),
			data: {
				type: 'appointment',
				appointment,
			},
			disabled: disabled || isDragOverlay || isTbd || isFullDay,
		})

	const startDate =
		appointment.startTime && 'toDate' in appointment.startTime
			? appointment.startTime.toDate()
			: new Date(appointment.startTime as Date)
	const endDate =
		appointment.endTime && 'toDate' in appointment.endTime
			? appointment.endTime.toDate()
			: new Date(appointment.endTime as Date)
	const durationMinutes = Math.round(
		(endDate.getTime() - startDate.getTime()) / 60000,
	)
	const fullDayDaysLabel = t('dayCountValue', {
		count: resolveAppointmentRequiredFullDayCount(
			appointment,
			findServiceDataForAppointment(appointment, services),
		),
	})

	const gridBasedHeight = adminCalendarBlockHeightPx(
		Math.max(1, durationMinutes),
	)
	const usePositionedCalendar =
		layout === 'calendar' && positionedCalendar != null

	const rawCalendarHeight = usePositionedCalendar
		? positionedCalendar.heightPx
		: (blockHeight ?? gridBasedHeight)

	const isList = layout === 'list'

	const overlayPixelHeight =
		isDragOverlay && typeof blockHeight === 'number' ? blockHeight : undefined

	const renderedHeightForTier =
		usePositionedCalendar && positionedCalendar
			? positionedCalendar.heightPx
			: overlayPixelHeight

	/** Timed grid only: density by duration (15 / 30 / 45 / 60+ min) and rendered height. */
	const timedTier: AdminCalendarSlotTier | null =
		!isList && !isFullDay && !isTbd
			? adminCalendarEffectiveSlotTier(
					durationMinutes,
					renderedHeightForTier ?? null,
				)
			: null

	const displayCalendarHeight = usePositionedCalendar
		? positionedCalendar.heightPx
		: overlayPixelHeight != null
			? overlayPixelHeight
			: isList || isFullDay || isTbd
				? rawCalendarHeight
				: Math.max(
						rawCalendarHeight,
						adminCalendarMinDisplayHeightForTier(
							adminCalendarSlotTier(durationMinutes),
						),
					)

	const hasNamedCustomer = (appointment.fullName || '').trim().length > 0
	const customerLabel = hasNamedCustomer
		? (appointment.fullName || '').trim()
		: t('customer')

	const style: React.CSSProperties = isList
		? {
				minHeight: 52,
				...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
			}
		: isDragOverlay && layout === 'calendar'
			? {
					position: 'relative',
					width: '7.35rem',
					minWidth: '5rem',
					maxWidth: '8rem',
					height: displayCalendarHeight,
					minHeight: displayCalendarHeight,
					maxHeight: displayCalendarHeight,
					boxSizing: 'border-box',
				}
			: usePositionedCalendar
				? {
						position: 'absolute',
						top: positionedCalendar.topPx,
						height: positionedCalendar.heightPx,
						...(positionedCalendar.leftPct != null &&
						positionedCalendar.widthPct != null
							? {
									left: `calc(${positionedCalendar.leftPct}% + 2px)`,
									width: `calc(${positionedCalendar.widthPct}% - 4px)`,
								}
							: { left: '0.1875rem', right: '0.1875rem' }),
						zIndex: positionedCalendar.zIndex,
						minHeight: 0,
						...(transform
							? { transform: CSS.Translate.toString(transform) }
							: {}),
					}
				: {
						minHeight: displayCalendarHeight,
						...(transform
							? { transform: CSS.Translate.toString(transform) }
							: {}),
					}

	const hoverTitle = (() => {
		if (timedTier === 'micro' || timedTier === 'compact') {
			return [
				appointment.service,
				hasNamedCustomer ? customerLabel : undefined,
				`${formatTimeUi(startDate, { locale })} – ${formatTimeUi(endDate, { locale })}`,
				appointment.adminNote?.trim() || undefined,
			]
				.filter(Boolean)
				.join(' · ')
		}
		const parts: (string | undefined)[] = [
			appointment.service,
			appointment.fullName?.trim() || undefined,
		]
		if (!isTbd && !isFullDay) {
			parts.push(
				`${formatTimeUi(startDate, { locale })} – ${formatTimeUi(endDate, { locale })}`,
			)
		} else if (isFullDay) {
			parts.push(`${t('allDayNoClockTime')} · ${fullDayDaysLabel}`)
		} else if (isTbd) {
			parts.push(t('listTbdNoTimeYet'))
		}
		if (appointment.adminNote?.trim()) parts.push(appointment.adminNote.trim())
		return parts.filter(Boolean).join(' · ')
	})()

	const handleCardClick = (e: React.MouseEvent) => {
		if (!onOpenDetail) return
		e.stopPropagation()
		onOpenDetail()
	}

	/** Keyboard equivalent of the card click — Enter/Space opens detail (or edits
	 *  a full-day block). Ignored when focus is on an inner action button. */
	const isCardInteractive = !!onOpenDetail || (isFullDay && !!onEdit)
	const handleCardKeyDown = (e: React.KeyboardEvent) => {
		if (e.key !== 'Enter' && e.key !== ' ') return
		if (e.target !== e.currentTarget) return
		e.preventDefault()
		if (onOpenDetail) onOpenDetail()
		else if (isFullDay && onEdit) onEdit()
	}

	const listOrSpecialChrome =
		'rounded-xl border border-white/12 px-3 py-2.5 text-sm shadow-md ring-1 ring-black/20'

	const listAwaitingChrome = 'rounded-xl px-3 py-2.5 text-sm shadow-none ring-0'

	/** Unscheduled queue + drag preview only — not for positioned grid cells. */
	const showAwaitingListChrome =
		awaitingCalendarAssignment && !isPast && (isList || isDragOverlay)

	const calendarShell = showAwaitingListChrome
		? listAwaitingChrome
		: isList || isFullDay || isTbd
			? listOrSpecialChrome
			: timedTier
				? tierChrome(timedTier)
				: 'rounded-lg border border-white/15 px-2 py-1.5'

	const bookingStatusValue = readBookingStatus(
		appointment as unknown as Record<string, unknown>,
	)
	const statusUi = getBookingStatusUi(bookingStatusValue)
	const hasExplicitStatus =
		bookingStatusValue !== 'pending' && !isPast

	// Cancelled blocks: pull the surface back from the service color so the
	// row visually recedes without losing the strong rose rail. We keep them
	// renderable so admin filter chips (Phase 4 follow-up) can still surface
	// them — by default the parent query hides cancelled rows.
	const isCancelled = bookingStatusValue === 'cancelled'
	const surfaceClass = isPast
		? PAST_COLOR
		: showAwaitingListChrome
			? 'bg-transparent border-2 border-dashed border-white/45 text-icyWhite/95'
			: isCancelled
				? `${getServiceColor(appointment, services)} opacity-55 saturate-50`
				: getServiceColor(appointment, services)

	/** Tall grid blocks: pin service / name / time to the top instead of vertically centering. */
	const timedBlockHeightPx = usePositionedCalendar
		? positionedCalendar.heightPx
		: !isList && !isFullDay && !isTbd
			? displayCalendarHeight
			: 0
	const alignTimedContentToTop =
		timedTier === 'medium' ||
		timedTier === 'full' ||
		(!isList && !isFullDay && !isTbd && timedBlockHeightPx >= 62)
	const innerColumnJustify =
		isList || isTbd || isFullDay || alignTimedContentToTop
			? 'justify-start'
			: 'justify-center'

	/** Left status rail: a crisp Google-Calendar-style edge. Booking status
	 *  takes priority once it leaves `pending`; otherwise we fall back to the
	 *  existing TBD/full-day/default palette so non-status semantics still
	 *  read at a glance. */
	const statusRailClass = isPast
		? 'bg-white/25'
		: hasExplicitStatus
			? statusUi.railClass
			: isTbd
				? 'bg-rose-400'
				: isFullDay
					? 'bg-amber-400'
					: 'bg-white/40'
	const showStatusRail = !showAwaitingListChrome

	/** Notification channel marker: shown on roomy blocks; the tiny micro/compact
	 *  timed tiers skip it (no space) — the detail popover still shows it. */
	const showChannelBadge =
		!isPast &&
		!awaitingCalendarAssignment &&
		!isDragOverlay &&
		(isList ||
			isFullDay ||
			isTbd ||
			timedTier === 'short' ||
			timedTier === 'medium' ||
			timedTier === 'full')

	const isTimedGrid = !isList && !isFullDay && !isTbd && !isDragOverlay

	/** Hover quick-actions (edit / cancel) — skip the tiny tiers and past blocks;
	 *  the detail popover remains the fallback everywhere. */
	const showHoverActions =
		!isPast &&
		!isDragOverlay &&
		!awaitingCalendarAssignment &&
		(onEdit != null || onCancel != null) &&
		(isList ||
			isFullDay ||
			timedTier === 'short' ||
			timedTier === 'medium' ||
			timedTier === 'full')

	/** Drag the bottom edge to change duration (timed grid blocks only). */
	const showResizeHandle = isTimedGrid && !isPast && onResizeStart != null

	return (
		<div
			ref={setNodeRef}
			data-testid='appointment-block'
			data-appointment-id={appointment.id}
			data-slot-tier={
				showAwaitingListChrome
					? 'awaiting'
					: (timedTier ?? (isList ? 'list' : 'special'))
			}
			style={style}
			title={onOpenDetail ? undefined : hoverTitle || undefined}
			aria-label={hoverTitle || appointment.service || undefined}
			onKeyDown={isCardInteractive ? handleCardKeyDown : undefined}
			{...(!disabled && !isTbd && !isFullDay
				? { ...listeners, ...attributes }
				: isCardInteractive
					? { tabIndex: 0, role: 'button' }
					: {})}
			onClick={
				onOpenDetail
					? handleCardClick
					: isFullDay && onEdit
						? e => {
								e.stopPropagation()
								onEdit()
							}
						: undefined
			}
			className={`
        ${
					isList
						? 'relative w-full'
						: isDragOverlay && layout === 'calendar'
							? 'relative shrink-0'
							: usePositionedCalendar
								? ''
								: 'absolute left-1 right-1'
				}
        text-xs font-medium
        ${calendarShell}
        relative overflow-hidden
        ${
					showAwaitingListChrome
						? ''
						: 'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/[0.1] before:to-transparent'
				}
        group select-none
        transition-shadow duration-150 ease-out
        focus-visible:outline-none focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-white/70
        ${isPast || isDragOverlay ? '' : 'hover:z-30 hover:shadow-lg hover:shadow-black/45 hover:ring-1 hover:ring-white/30'}
        ${usePositionedCalendar ? 'pointer-events-auto' : ''}
        ${surfaceClass}
        ${isDragging ? 'z-40 opacity-30 cursor-grabbing' : ''}
        ${
					isFullDay && onEdit
						? 'cursor-pointer'
						: disabled || isTbd || isFullDay
							? 'cursor-default'
							: 'cursor-grab touch-none active:cursor-grabbing'
				}
      `}
		>
			{showStatusRail ? (
				<span
					className={`pointer-events-none absolute inset-y-0 left-0 z-[2] w-[3px] rounded-l-[inherit] ${statusRailClass}`}
					aria-hidden
				/>
			) : null}
			<div
				className={`relative z-[1] flex h-full min-h-[18px] w-full flex-col ${innerColumnJustify} ${
					hasExplicitStatus && !showAwaitingListChrome && !isDragOverlay
						? 'pl-5'
						: ''
				} ${showChannelBadge ? 'pr-6' : ''}`}
			>
				{isList ? (
					<>
						<div className='line-clamp-2 text-sm font-semibold tracking-tight'>
							{appointment.service}
						</div>
						<div className='mt-0.5 line-clamp-1 text-[11px] opacity-90'>
							{appointment.fullName}
						</div>
						<div className='mt-0.5 text-[10px] tabular-nums text-icyWhite/70'>
							{isTbd ? (
								<>
									<span>{t('listTbdNoTimeYet')}</span>
									{durationMinutes > 0 && (
										<span className='text-icyWhite/50'>
											{' '}
											· {t('durationMinutesAbbr', { minutes: durationMinutes })}
										</span>
									)}
								</>
							) : isFullDay ? (
								<>
									{t('allDayNoClockTime')}
									<span className='text-icyWhite/55'>
										{' '}
										· {fullDayDaysLabel}
									</span>
								</>
							) : (
								<>
									{formatTimeUi(startDate, { locale })} –{' '}
									{formatTimeUi(endDate, { locale })}
								</>
							)}
						</div>
						{appointment.adminNote?.trim() && (
							<div className='mt-0.5 line-clamp-2 text-[10px] italic opacity-60'>
								{appointment.adminNote.trim()}
							</div>
						)}
					</>
				) : isTbd ? (
					<>
						<div className='line-clamp-2 text-[11px] font-semibold leading-snug tracking-tight sm:text-xs'>
							{appointment.service}
						</div>
						<div className='mt-0.5 text-[9px] leading-tight text-icyWhite/75'>
							{t('listTbdNoTimeYet')}
							{durationMinutes > 0 && (
								<span className='text-icyWhite/50'>
									{' '}
									· {t('durationMinutesAbbr', { minutes: durationMinutes })}
								</span>
							)}
						</div>
					</>
				) : isFullDay ? (
					<>
						<div className='line-clamp-2 text-xs font-semibold leading-snug tracking-tight sm:text-sm'>
							{appointment.service}
						</div>
						<div className='mt-1 text-[10px] leading-snug text-icyWhite/80'>
							{t('allDayNoClockTime')}
							<span className='text-icyWhite/55'> · {fullDayDaysLabel}</span>
						</div>
					</>
				) : timedTier === 'micro' ? (
					<div className='line-clamp-1 text-[9px] font-semibold leading-none tracking-tight text-icyWhite sm:text-[10px]'>
						<span className='text-icyWhite'>{appointment.service || '—'}</span>
						<span className='font-normal text-icyWhite/75'>
							{' '}
							· {formatTimeUi(startDate, { locale })}
						</span>
					</div>
				) : timedTier === 'compact' ? (
					<div className='flex min-h-0 flex-col justify-center gap-0.5'>
						<div className='line-clamp-1 text-[10px] font-semibold leading-tight tracking-tight text-icyWhite'>
							{appointment.service || '—'}
						</div>
						<div className='line-clamp-1 text-[9px] tabular-nums leading-none text-icyWhite/70'>
							{formatTimeUi(startDate, { locale })} –{' '}
							{formatTimeUi(endDate, { locale })}
						</div>
					</div>
				) : timedTier === 'short' ? (
					<div className='flex min-h-0 flex-col justify-center gap-0.5'>
						<div className='line-clamp-2 text-[10px] font-semibold leading-snug tracking-tight text-icyWhite sm:text-[11px]'>
							{appointment.service}
						</div>
						<div className='line-clamp-1 truncate text-[9px] text-icyWhite/88 sm:text-[10px]'>
							{customerLabel}
						</div>
						<div className='text-[9px] tabular-nums leading-none text-icyWhite/65 sm:text-[10px]'>
							{formatTimeUi(startDate, { locale })} –{' '}
							{formatTimeUi(endDate, { locale })}
						</div>
					</div>
				) : timedTier === 'medium' ? (
					<div className='flex min-h-0 flex-col justify-start gap-1'>
						<div className='line-clamp-2 text-[11px] font-semibold leading-snug tracking-tight sm:text-xs'>
							{appointment.service}
						</div>
						<div className='line-clamp-1 truncate text-[10px] text-icyWhite/90'>
							{customerLabel}
						</div>
						<div className='text-[10px] tabular-nums text-icyWhite/65'>
							{formatTimeUi(startDate, { locale })} –{' '}
							{formatTimeUi(endDate, { locale })}
						</div>
						{appointment.adminNote?.trim() ? (
							<div className='line-clamp-1 truncate text-[9px] italic text-icyWhite/50'>
								{appointment.adminNote.trim()}
							</div>
						) : null}
					</div>
				) : timedTier === 'full' ? (
					<div className='flex min-h-0 flex-col justify-start gap-1'>
						<div className='line-clamp-2 text-xs font-semibold leading-snug tracking-tight sm:text-sm'>
							{appointment.service}
						</div>
						<div className='line-clamp-1 truncate text-[11px] text-icyWhite/92'>
							{customerLabel}
						</div>
						<div className='text-[11px] tabular-nums text-icyWhite/70'>
							{formatTimeUi(startDate, { locale })} –{' '}
							{formatTimeUi(endDate, { locale })}
						</div>
						{appointment.adminNote?.trim() ? (
							<div className='line-clamp-2 truncate text-[10px] italic text-icyWhite/55'>
								{appointment.adminNote.trim()}
							</div>
						) : null}
					</div>
				) : null}
			</div>
			{showChannelBadge ? (
				<NotificationChannelBadge
					appointment={appointment}
					className={`pointer-events-none absolute right-1 top-1 z-[2] ${
						showHoverActions ? 'transition-opacity group-hover:opacity-0' : ''
					}`}
				/>
			) : null}
			{hasExplicitStatus && !showAwaitingListChrome && !isDragOverlay ? (
				<span
					className={`pointer-events-none absolute left-1 top-1 z-[2] inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border ${statusUi.badgeClass}`}
					aria-label={t(`bookingStatus.${statusUi.i18nKey}`)}
					title={t(`bookingStatus.${statusUi.i18nKey}`)}
				>
					<statusUi.icon
						className={`h-2.5 w-2.5 ${statusUi.iconClass}`}
						strokeWidth={2.5}
						aria-hidden
					/>
				</span>
			) : null}
			{showHoverActions ? (
				<div className='absolute right-1 top-1 z-[4] flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100'>
					{onEdit ? (
						<button
							type='button'
							onPointerDown={e => e.stopPropagation()}
							onClick={e => {
								e.stopPropagation()
								e.preventDefault()
								onEdit()
							}}
							className='inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/15 bg-nearBlack/75 text-icyWhite/90 backdrop-blur-sm transition-colors hover:bg-nearBlack hover:text-icyWhite'
							aria-label={t('editAppointment')}
							title={t('editAppointment')}
						>
							<Pencil className='h-3 w-3' />
						</button>
					) : null}
					{onCancel ? (
						<button
							type='button'
							onPointerDown={e => e.stopPropagation()}
							onClick={e => {
								e.stopPropagation()
								e.preventDefault()
								onCancel()
							}}
							className='inline-flex h-5 w-5 items-center justify-center rounded-md border border-red-400/30 bg-red-500/25 text-red-100 backdrop-blur-sm transition-colors hover:bg-red-500/45'
							aria-label={t('cancel')}
							title={t('cancel')}
						>
							<X className='h-3 w-3' />
						</button>
					) : null}
				</div>
			) : null}
			{showResizeHandle ? (
				<div
					onPointerDown={e => {
						e.stopPropagation()
						onResizeStart?.(e)
					}}
					onClick={e => e.stopPropagation()}
					className='absolute inset-x-0 bottom-0 z-[3] flex h-2.5 cursor-ns-resize items-end justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100'
					role='separator'
					aria-label={t('resizeDurationAria')}
					title={t('resizeDurationAria')}
				>
					<span className='mb-0.5 h-1 w-6 rounded-full bg-white/55' aria-hidden />
				</div>
			) : null}
		</div>
	)
}
