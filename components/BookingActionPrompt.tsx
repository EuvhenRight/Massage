/**
 * Intermediate "are you sure?" page that gates booking state transitions
 * behind an explicit human submit. Mounted on:
 *
 *   /sk/booking/confirm-action?t=<token>
 *   /sk/booking/cancel-action?t=<token>
 *
 * The matching API route's GET handler redirects here; the actual transition
 * fires only when the form below POSTs back to `formAction`. This kills the
 * entire class of bug where a link-preview crawler (or any other GET-only
 * fetcher) silently triggers the action — POST is required for state
 * change, period.
 *
 * Slovak-only by product decision; see `app/[locale]/booking/confirmed/page.tsx`
 * for the same rationale.
 */

import Link from 'next/link'
import { CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'

export type PromptVariant = 'confirm' | 'cancel' | 'error'

export interface BookingActionPromptSummary {
	service: string
	date: string
	time: string
}

export interface BookingActionPromptProps {
	variant: PromptVariant
	title: string
	body: string
	/** Optional appointment summary card. Omit on error states. */
	summary?: BookingActionPromptSummary | null
	summaryLabels?: {
		heading: string
		service: string
		date: string
		time: string
		location: string
	}
	/** Localized labels for buttons and footer. */
	labels: {
		submit: string
		back: string
		needHelp: string
	}
	/** URL the form POSTs to. Omit on error states (no action available). */
	formAction?: string
	/** Hidden inputs to include in the form (e.g. `t` token). */
	formFields?: Record<string, string>
	/** Where the back button links — typically the locale root. */
	homeHref: string
}

function VariantIcon({ variant }: { variant: PromptVariant }) {
	if (variant === 'confirm') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40 shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]'
				aria-hidden
			>
				<CheckCircle2 className='h-9 w-9 text-emerald-400' strokeWidth={1.75} />
			</div>
		)
	}
	if (variant === 'cancel') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-400/40 shadow-[0_0_40px_-8px_rgba(244,63,94,0.45)]'
				aria-hidden
			>
				<XCircle className='h-9 w-9 text-rose-400' strokeWidth={1.75} />
			</div>
		)
	}
	return (
		<div
			className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/40 shadow-[0_0_40px_-8px_rgba(245,158,11,0.45)]'
			aria-hidden
		>
			<XCircle className='h-9 w-9 text-amber-400' strokeWidth={1.75} />
		</div>
	)
}

export default function BookingActionPrompt({
	variant,
	title,
	body,
	summary,
	summaryLabels,
	labels,
	formAction,
	formFields,
	homeHref,
}: BookingActionPromptProps) {
	// Submit button styling differs per intent: aurora-magenta gradient for the
	// destructive cancel action (brand red, not generic rose), gold gradient for
	// the positive confirm action. Both carry a glow shadow + shimmer sweep on
	// hover to match the premium dark/gold aesthetic used in the rest of the app.
	const submitClass =
		variant === 'cancel'
			? 'group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-aurora-magenta via-aurora-magenta to-rose-600 px-4 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_4px_24px_-6px_rgba(236,72,153,0.6)] transition-all duration-300 hover:shadow-[0_6px_32px_-6px_rgba(236,72,153,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-aurora-magenta focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'
			: 'group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-glow via-gold-soft to-gold-soft px-4 py-3.5 text-sm font-semibold tracking-wide text-nearBlack shadow-[0_4px_24px_-6px_rgba(232,184,0,0.6)] transition-all duration-300 hover:shadow-[0_6px_32px_-6px_rgba(232,184,0,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-glow focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'

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

				{formAction ? (
					<form action={formAction} method='POST' className='mt-8'>
						{formFields
							? Object.entries(formFields).map(([name, value]) => (
									<input key={name} type='hidden' name={name} value={value} />
								))
							: null}
						<button type='submit' className={submitClass}>
							<span className='pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full' />
							<span className='relative'>{labels.submit}</span>
						</button>
					</form>
				) : null}

				<Link
					href={homeHref}
					className='mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-medium text-icyWhite/85 transition-colors hover:border-gold-soft/40 hover:bg-gold-soft/[0.06] hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nearBlack'
				>
					{labels.back}
				</Link>

				<p className='mt-8 text-xs text-icyWhite/50'>
					{labels.needHelp}{' '}
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
