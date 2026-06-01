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
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30'
				aria-hidden
			>
				<CheckCircle2 className='h-9 w-9 text-emerald-500' strokeWidth={1.75} />
			</div>
		)
	}
	if (variant === 'cancelled') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/30'
				aria-hidden
			>
				<XCircle className='h-9 w-9 text-rose-500' strokeWidth={1.75} />
			</div>
		)
	}
	// Neutral icon for error states (expired tokens, missing appointments).
	return (
		<div
			className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30'
			aria-hidden
		>
			<XCircle className='h-9 w-9 text-amber-500' strokeWidth={1.75} />
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
				<h1 className='mt-6 text-2xl font-semibold tracking-tight sm:text-3xl'>
					{title}
				</h1>
				<p className='mt-3 text-base text-gray-600 sm:text-base'>{body}</p>

				{summary && summaryLabels ? (
					<dl className='mt-8 rounded-2xl border border-gray-200 bg-white/60 p-5 text-left shadow-sm backdrop-blur-sm'>
						<p className='text-xs font-medium uppercase tracking-wider text-gray-500'>
							{summaryLabels.heading}
						</p>
						<div className='mt-3 space-y-2.5'>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-gray-500'>
									{summaryLabels.service}
								</dt>
								<dd className='text-right font-medium text-gray-900'>
									{summary.service}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-gray-500'>{summaryLabels.date}</dt>
								<dd className='text-right font-medium text-gray-900'>
									{summary.date}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-gray-500'>{summaryLabels.time}</dt>
								<dd className='text-right font-medium tabular-nums text-gray-900'>
									{summary.time}
								</dd>
							</div>
							<div className='flex items-start justify-between gap-4 text-sm'>
								<dt className='shrink-0 text-gray-500'>
									{summaryLabels.location}
								</dt>
								<dd className='text-right font-medium text-gray-900'>
									{SITE_CONFIG.name}
									<span className='block text-xs font-normal text-gray-500'>
										{SITE_CONFIG.address}
									</span>
								</dd>
							</div>
						</div>
					</dl>
				) : null}

				<div className='mt-8 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center'>
					{variant === 'confirmed' && summary ? (
						<a
							href={SITE_CONFIG.googleMaps}
							target='_blank'
							rel='noopener noreferrer'
							className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50'
						>
							<MapPin className='h-4 w-4' />
							{actionLabels.getDirections}
						</a>
					) : null}
					{variant === 'cancelled' ? (
						<Link
							href={bookAnotherHref}
							className='inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800'
						>
							{actionLabels.bookAnother}
						</Link>
					) : null}
					<Link
						href={homeHref}
						className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
					>
						{actionLabels.backHome}
					</Link>
				</div>

				{extraActions ? (
					<div className='mt-4 flex justify-center'>{extraActions}</div>
				) : null}

				<p className='mt-8 text-xs text-gray-500'>
					{actionLabels.needHelp}{' '}
					<a
						href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
						className='font-medium text-gray-700 underline-offset-2 hover:underline'
					>
						{SITE_CONFIG.phone}
					</a>
				</p>
			</div>
		</main>
	)
}
