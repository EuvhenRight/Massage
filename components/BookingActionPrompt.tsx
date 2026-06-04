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
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30'
				aria-hidden
			>
				<CheckCircle2 className='h-9 w-9 text-emerald-500' strokeWidth={1.75} />
			</div>
		)
	}
	if (variant === 'cancel') {
		return (
			<div
				className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/30'
				aria-hidden
			>
				<XCircle className='h-9 w-9 text-rose-500' strokeWidth={1.75} />
			</div>
		)
	}
	return (
		<div
			className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30'
			aria-hidden
		>
			<XCircle className='h-9 w-9 text-amber-500' strokeWidth={1.75} />
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
	// Submit button styling differs per intent — emerald for confirm, rose
	// for cancel — so the destructive action reads visually distinct.
	const submitClass =
		variant === 'cancel'
			? 'inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2'
			: 'inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-6 py-16'>
			<div className='w-full max-w-md text-center'>
				<VariantIcon variant={variant} />
				<h1 className='mt-6 text-2xl font-semibold tracking-tight sm:text-3xl'>
					{title}
				</h1>
				<p className='mt-3 text-base text-gray-600'>{body}</p>

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
									<span className='inline-flex items-center gap-1'>
										<MapPin className='h-3.5 w-3.5 text-gray-400' aria-hidden />
										{SITE_CONFIG.name}
									</span>
									<span className='block text-xs font-normal text-gray-500'>
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
							{labels.submit}
						</button>
					</form>
				) : null}

				<Link
					href={homeHref}
					className='mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
				>
					{labels.back}
				</Link>

				<p className='mt-8 text-xs text-gray-500'>
					{labels.needHelp}{' '}
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
