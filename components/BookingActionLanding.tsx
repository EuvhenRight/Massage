/**
 * Shared landing screen for `/booking/confirmed` and `/booking/cancelled`.
 *
 * Renders three layers:
 *   1. Status icon + title + supporting copy (variant-driven).
 *   2. Optional appointment summary (service / date / time / location) when
 *      the route handler resolved a valid token to a real appointment.
 *   3. Action row — back-to-home + variant-specific call to action
 *      (directions for confirmed, book-another for cancelled), plus a
 *      contact line for follow-up questions.
 *
 * The component is presentational only: data resolution (token verify,
 * appointment fetch, copy selection) belongs in the page server component.
 * That keeps the same shell reusable for any future "post-action" page
 * (reschedule, no-show acknowledgement, etc.).
 */

import Link from 'next/link'
import { CheckCircle2, MapPin, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { SITE_CONFIG } from '@/lib/site-config'

export type LandingVariant = 'confirmed' | 'cancelled' | 'error'

export interface BookingActionLandingSummary {
	service: string
	date: string
	time: string
}

export interface BookingActionLandingProps {
	variant: LandingVariant
	title: string
	body: string
	/** Optional appointment summary; omit for token/error states. */
	summary?: BookingActionLandingSummary | null
	/**
	 * Localized strings for the optional summary card. Required when
	 * `summary` is provided.
	 */
	summaryLabels?: {
		heading: string
		service: string
		date: string
		time: string
		location: string
	}
	/** Localized action row labels. */
	actionLabels: {
		backHome: string
		bookAnother: string
		getDirections: string
		needHelp: string
	}
	/** Where "back to home" links — typically the locale root. */
	homeHref: string
	/** Where "book another" links — typically the place-scoped booking page. */
	bookAnotherHref: string
	/** Optional slot for future ICS / add-to-calendar button. */
	extraActions?: ReactNode
}

function VariantIcon({ variant }: { variant: LandingVariant }): ReactNode {
	if (variant === 'confirmed') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40 shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]'
				aria-hidden
			>
				<CheckCircle2 className='h-9 w-9 text-emerald-400' strokeWidth={1.75} />
			</div>
		)
	}
	if (variant === 'cancelled') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-400/40 shadow-[0_0_40px_-8px_rgba(244,63,94,0.45)]'
				aria-hidden
			>
				<XCircle className='h-9 w-9 text-rose-400' strokeWidth={1.75} />
			</div>
		)
	}
	// Neutral icon for error states (expired tokens, missing appointments).
	return (
		<div
			className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40 shadow-[0_0_40px_-8px_rgba(245,158,11,0.45)]'
			aria-hidden
		>
			<XCircle className='h-9 w-9 text-amber-400' strokeWidth={1.75} />
		</div>
	)
}

export default function BookingActionLanding({
	variant,
	title,
	body,
	summary,
	summaryLabels,
	actionLabels,
	homeHref,
	bookAnotherHref,
	extraActions,
}: BookingActionLandingProps) {
	return (
		<main className='min-h-[80vh] flex items-center justify-center px-6 py-16'>
			<div className='w-full max-w-md text-center'>
				<VariantIcon variant={variant} />
				<h1 className='mt-6 font-serif text-2xl font-semibold tracking-tight text-icyWhite sm:text-3xl'>
					{title}
				</h1>
				<p className='mt-3 text-base text-icyWhite/65'>{body}</p>

				{summary && summaryLabels ? (
					<dl className='mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm'>
						<p className='text-[11px] font-medium uppercase tracking-wider text-icyWhite/45'>
							{summaryLabels.heading}
						</p>
						<div className='mt-3 space-y-2.5'>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-icyWhite/55'>
									{summaryLabels.service}
								</dt>
								<dd className='text-right font-medium text-icyWhite'>
									{summary.service}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-icyWhite/55'>{summaryLabels.date}</dt>
								<dd className='text-right font-medium text-icyWhite'>
									{summary.date}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-icyWhite/55'>{summaryLabels.time}</dt>
								<dd className='text-right font-medium tabular-nums text-icyWhite'>
									{summary.time}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-icyWhite/55'>
									{summaryLabels.location}
								</dt>
								<dd className='text-right font-medium text-icyWhite'>
									<span className='inline-flex items-center gap-1'>
										<MapPin className='h-3.5 w-3.5 text-gold-soft' aria-hidden />
										{SITE_CONFIG.name}
									</span>
									<span className='block text-xs font-normal text-icyWhite/50'>
										{SITE_CONFIG.address}
									</span>
								</dd>
							</div>
						</div>
					</dl>
				) : null}

				<div className='mt-8 flex flex-col items-stretch gap-2.5'>
					{variant === 'confirmed' && summary ? (
						<a
							href={SITE_CONFIG.googleMaps}
							target='_blank'
							rel='noopener noreferrer'
							className='group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-gold-glow via-gold-soft to-gold-soft px-4 py-3.5 text-sm font-semibold tracking-wide text-nearBlack shadow-[0_4px_24px_-6px_rgba(232,184,0,0.6)] transition-[background-color,border-color,color,box-shadow] duration-300 hover:shadow-[0_6px_32px_-6px_rgba(232,184,0,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-glow focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'
						>
							<span className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
							<MapPin className='relative h-4 w-4' />
							<span className='relative'>{actionLabels.getDirections}</span>
						</a>
					) : null}
					{variant === 'cancelled' ? (
						<Link
							href={bookAnotherHref}
							className='group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-glow via-gold-soft to-gold-soft px-4 py-3.5 text-sm font-semibold tracking-wide text-nearBlack shadow-[0_4px_24px_-6px_rgba(232,184,0,0.6)] transition-[background-color,border-color,color,box-shadow] duration-300 hover:shadow-[0_6px_32px_-6px_rgba(232,184,0,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-glow focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'
						>
							<span className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
							<span className='relative'>{actionLabels.bookAnother}</span>
						</Link>
					) : null}
					<Link
						href={homeHref}
						className='inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-medium text-icyWhite/85 transition-colors hover:border-gold-soft/40 hover:bg-gold-soft/[0.06] hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'
					>
						{actionLabels.backHome}
					</Link>
				</div>

				{extraActions ? (
					<div className='mt-4 flex justify-center'>{extraActions}</div>
				) : null}

				<p className='mt-8 text-xs text-icyWhite/50'>
					{actionLabels.needHelp}{' '}
					<a
						href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
						className='font-medium text-gold-soft underline-offset-2 hover:underline'
					>
						{SITE_CONFIG.phone}
					</a>
				</p>
			</div>
		</main>
	)
}
