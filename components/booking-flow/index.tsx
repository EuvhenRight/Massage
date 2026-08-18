'use client'

import {
	bookAppointment,
	bookScheduleTbdAppointment,
} from '@/lib/book-appointment'
import { getDateKey } from '@/lib/booking'
import { getBookingAccent } from '@/lib/booking-accent'
import type { BookingFormData } from '@/lib/booking-schema'
import { formatDateForEmail, formatTimeForEmail } from '@/lib/format-date'
import { findBookableServiceForSelection } from '@/lib/services'
import { parseWhatsappE164 } from '@/lib/phone-e164'
import type { Place } from '@/lib/places'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Search as SearchIcon, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { toast } from 'sonner'
import { BookingFlowProvider, useBookingFlow } from './BookingFlowContext'
import {
	BookingCartList,
	BookingCartSummaryLine,
	BookingCartTotals,
	useCartPriceLabel,
} from './BookingCart'
import BookingSidebar from './BookingSidebar'
import { Input } from '@/components/ui/input'
import BookingStepProgress from './BookingStepProgress'
import StepCustomerInfo, {
	type StepCustomerInfoHandle,
} from './StepCustomerInfo'
import StepServiceAndDate from './StepServiceAndDate'
import StepServiceFromPriceCatalog, {
	type StepServiceFromPriceCatalogHandle,
} from './StepServiceFromPriceCatalog'

export interface BookingFlowProps {
	services: {
		id?: string
		title: string
		durationMinutes?: number
		bookingGranularity?: 'time' | 'day' | 'tbd'
		bookingDayCount?: number
		scheduleTbdMessage?: string
		scheduleTbdAdminNote?: string
		titleSk?: string
		titleEn?: string
		titleRu?: string
		titleUk?: string
	}[]
	defaultDuration?: number
	defaultService?: string
	priceCatalog?: PriceCatalogStructure | null
	onSuccess?: () => void
	onCancel?: () => void
	place?: Place
	/** Skip restoring booking draft (use with `?from=price` deep links). */
	skipDraftRestore?: boolean
}

function BookingFlowInner({
	services,
	defaultDuration = 60,
	priceCatalog,
	onSuccess,
	onCancel,
	place = 'massage',
}: BookingFlowProps) {
	const accent = useMemo(() => getBookingAccent(place), [place])
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const tValidation = useTranslations('validation')
	const cartPriceLabel = useCartPriceLabel()
	const locale = useLocale()
	const router = useRouter()
	const {
		step,
		service,
		items,
		removeItem,
		priceTotal,
		date,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		scheduleTbdCustomerMessage,
		scheduleTbdAdminHint,
		fullName,
		email,
		phone,
		birthday,
		optInMarketing,
		notifyByEmail,
		notifyByWhatsApp,
		nextStep,
		prevStep,
		clearDraft,
	} = useBookingFlow()
	const [searchQuery, setSearchQuery] = useState('')
	const [mobileCartOpen, setMobileCartOpen] = useState(false)
	/**
	 * True while a back press stays inside the flow (walking up the catalog
	 * tree). Drives the button's wording: it must promise what it will actually
	 * do — "Cancel" on a press that only goes back one level made people think
	 * they were about to lose their booking.
	 */
	const [catalogCanGoBack, setCatalogCanGoBack] = useState(false)
	/** Live height of the fixed mobile bar, so the scroll area can clear it. */
	const bottomBarRef = useRef<HTMLDivElement | null>(null)
	const [bottomBarHeight, setBottomBarHeight] = useState(0)
	useLayoutEffect(() => {
		const el = bottomBarRef.current
		if (!el || typeof ResizeObserver === 'undefined') return
		const sync = () => setBottomBarHeight(el.getBoundingClientRect().height)
		sync()
		const ro = new ResizeObserver(sync)
		ro.observe(el)
		return () => ro.disconnect()
	}, [])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [formValid, setFormValid] = useState(false)
	const stepCustomerRef = useRef<StepCustomerInfoHandle | null>(null)
	const stepCatalogRef = useRef<StepServiceFromPriceCatalogHandle | null>(null)

	/** Only the press that truly abandons the booking should say "Cancel". */
	const leavesFlowOnBack = step === 1 && !catalogCanGoBack

	const mobileCartPrice = cartPriceLabel(priceTotal)

	const canNextStep12 =
		(step === 1 && items.length > 0) ||
		(step === 2 &&
			(bookingGranularity === 'tbd' ||
				(bookingGranularity === 'time' && !!date && !!time)))
	const canNextStep3 = step === 3 && formValid
	const isMobileReview = step === 4
	/** Context phone lags behind the step-3 form until Next/confirm syncs — do not use for desktop step 3. */
	const notifyOk =
		(notifyByEmail || notifyByWhatsApp) &&
		(!notifyByWhatsApp || !!parseWhatsappE164(phone || ''))
	const hasContactBasics = !!(fullName?.trim() && email?.trim() && phone?.trim())
	const canConfirm = isMobileReview
		? hasContactBasics && notifyOk
		: formValid

	const handleBack = useCallback(() => {
		if (step === 1 && stepCatalogRef.current?.handleSubStepBack()) {
			return
		}
		if (step > 1) {
			prevStep()
			return
		}
		if (onCancel) {
			onCancel()
			return
		}
		// Step 1 with no host-supplied onCancel: leave the flow gracefully.
		// `router.back()` is a no-op when the booking page was opened directly
		// (no in-app history), so the Cancel button used to feel dead. Use
		// `back()` only when the previous entry came from this same origin;
		// otherwise navigate to the place landing as a stable fallback.
		const fallback = `/${locale}/${place}`
		if (typeof window !== 'undefined') {
			try {
				const sameOrigin =
					!!document.referrer &&
					new URL(document.referrer).origin === window.location.origin
				if (sameOrigin && window.history.length > 1) {
					router.back()
					return
				}
			} catch {
				/* fall through to push */
			}
		}
		router.push(fallback)
	}, [step, prevStep, onCancel, router, locale, place])

	const handleConfirm = useCallback(
		async (formData?: BookingFormData) => {
			if (!notifyByEmail && !notifyByWhatsApp) {
				toast.error(t('notifyChannelsRequired'))
				return
			}
			if (notifyByWhatsApp && !parseWhatsappE164((formData?.phone ?? phone) || '')) {
				toast.error(tValidation('invalidPhone'))
				return
			}
			if (bookingGranularity !== 'tbd' && !date) return

			// Success screen shows the leaf name per line, with the full catalog
			// path underneath when it adds information.
			const bookedLines = items.map(i => ({
				leaf: i.title.includes(' › ')
					? (i.title.split(' › ').pop() ?? i.title)
					: i.title,
				full: i.title,
			}))

			if (bookingGranularity === 'tbd') {
				const dataTbd: BookingFormData = formData ?? {
					service: service || '',
					fullName: fullName || '',
					email: email || '',
					phone: phone || '',
				}
				setIsSubmitting(true)
				try {
					const finalService =
						(service || dataTbd.service || services[0]?.title) ?? ''
					const selected =
						findBookableServiceForSelection(finalService, services) ??
						services[0]
					await bookScheduleTbdAppointment(
						{
							service: finalService,
							items,
							fullName: dataTbd.fullName,
							email: dataTbd.email,
							phone: dataTbd.phone,
							durationMinutes: selected?.durationMinutes ?? durationMinutes,
							serviceId: selected?.id,
							serviceSk: selected?.titleSk ?? finalService,
							serviceEn: selected?.titleEn ?? finalService,
							serviceRu: selected?.titleRu ?? finalService,
							serviceUk: selected?.titleUk ?? finalService,
							scheduleTbdAdminHint: scheduleTbdAdminHint || undefined,
							multiDayFullDayCount: bookingDayCount,
							notifyByEmail,
							notifyByWhatsApp,
							birthday: dataTbd.birthday || birthday || undefined,
							optInMarketing:
								dataTbd.optInMarketing === true || optInMarketing === true,
						},
						place,
					)

					const res = await fetch('/api/send-confirmation', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							to: dataTbd.email,
							customerName: dataTbd.fullName,
							customerPhone: dataTbd.phone,
							date: t('emailScheduleTbdDateLine'),
							time: t('emailScheduleTbdTimeLine'),
							service: finalService,
							// Per-service titles so the email lists them instead of
							// relying on the route splitting the joined string.
							serviceTitles: items.map(i => i.title),
							fullCalendarDayCount: bookingDayCount,
							bookingPlace: place,
							notifyByEmail,
							notifyByWhatsApp,
						}),
					})

					if (!res.ok) {
						const errBody = await res.json().catch(() => ({}))
						toast.error(
							t('emailNotSent', {
								error: errBody?.error ?? 'email could not be sent',
							}),
						)
					} else {
						const okBody = (await res.json().catch(() => ({}))) as {
							whatsapp?: { customer?: string }
							whatsappCustomerMeta?: {
								twilioCode?: number
								skipReason?: string
							}
						}
						if (
							notifyByWhatsApp &&
							okBody.whatsapp?.customer !== 'sent'
						) {
							const meta = okBody.whatsappCustomerMeta
							if (meta?.twilioCode === 63016) {
								toast.warning(t('whatsappError63016'))
							} else if (meta?.skipReason === 'twilio_env') {
								toast.warning(t('whatsappErrorEnvMissing'))
							} else {
								toast.warning(
									notifyByEmail
										? t('whatsappNotDeliveredWithEmail')
										: t('whatsappNotDeliveredNoEmail'),
								)
							}
						}
						clearDraft()
						setSuccessMessage(
							JSON.stringify({
								title: t('bookingConfirmed'),
								services: bookedLines,
								fullDayCount: bookingDayCount,
							}),
						)
					}
					onSuccess?.()
				} catch {
					toast.error(t('bookingFailed'))
				} finally {
					setIsSubmitting(false)
				}
				return
			}

			if (!date) return
			if (!time) return

			const data: BookingFormData = formData ?? {
				service: service || '',
				fullName: fullName || '',
				email: email || '',
				phone: phone || '',
			}
			setIsSubmitting(true)
			try {
				const finalService =
					(service || data.service || services[0]?.title) ?? ''
				const selected =
					findBookableServiceForSelection(finalService, services) ??
					services[0]
				const dateStr = getDateKey(date)
				const startTime = time!

				await bookAppointment(
					{
						date: dateStr,
						startTime,
						durationMinutes,
						service: finalService,
						items,
						serviceId: selected?.id,
						serviceSk: selected?.titleSk ?? finalService,
						serviceEn: selected?.titleEn ?? finalService,
						serviceRu: selected?.titleRu ?? finalService,
						serviceUk: selected?.titleUk ?? finalService,
						fullName: data.fullName,
						email: data.email,
						phone: data.phone,
						notifyByEmail,
						notifyByWhatsApp,
						birthday: data.birthday || birthday || undefined,
						optInMarketing:
							data.optInMarketing === true || optInMarketing === true,
					},
					place,
				)

				const slotDate = new Date(date)
				const [h, m] = time!.split(':').map(Number)
				slotDate.setHours(h, m, 0, 0)

				const res = await fetch('/api/send-confirmation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						to: data.email,
						customerName: data.fullName,
						customerPhone: data.phone,
						date: formatDateForEmail(slotDate),
						time: formatTimeForEmail(slotDate),
						service: finalService,
						serviceTitles: items.map(i => i.title),
						bookingPlace: place,
						notifyByEmail,
						notifyByWhatsApp,
					}),
				})

				if (!res.ok) {
					const errData = await res.json().catch(() => ({}))
					toast.error(
						t('emailNotSent', {
							error: errData?.error ?? 'email could not be sent',
						}),
					)
				} else {
					const okBody = (await res.json().catch(() => ({}))) as {
						whatsapp?: { customer?: string }
						whatsappCustomerMeta?: {
							twilioCode?: number
							skipReason?: string
						}
					}
					if (
						notifyByWhatsApp &&
						okBody.whatsapp?.customer !== 'sent'
					) {
						const meta = okBody.whatsappCustomerMeta
						if (meta?.twilioCode === 63016) {
							toast.warning(t('whatsappError63016'))
						} else if (meta?.skipReason === 'twilio_env') {
							toast.warning(t('whatsappErrorEnvMissing'))
						} else {
							toast.warning(
								notifyByEmail
									? t('whatsappNotDeliveredWithEmail')
									: t('whatsappNotDeliveredNoEmail'),
							)
						}
					}
					clearDraft()
					setSuccessMessage(
						JSON.stringify({
							title: t('bookingConfirmed'),
							services: bookedLines,
						}),
					)
				}
				onSuccess?.()
			} catch (err) {
				const code = err instanceof Error ? err.message : ''
				const msg =
					code === 'OVERLAP'
						? t('slotUnavailable')
						: t('bookingFailed')
				toast.error(msg)
			} finally {
				setIsSubmitting(false)
			}
		},
		[
			date,
			time,
			durationMinutes,
			bookingGranularity,
			service,
			items,
			services,
			scheduleTbdAdminHint,
			bookingDayCount,
			fullName,
			email,
			phone,
			notifyByEmail,
			notifyByWhatsApp,
			birthday,
			optInMarketing,
			onSuccess,
			place,
			t,
			tValidation,
			clearDraft,
		],
	)

	const getDesktopButtonLabel = () => {
		if (step <= 2) return t('next')
		return t('confirmBooking')
	}
	const getDesktopCanProceed = () => {
		if (step <= 2) return !!canNextStep12
		return !!canConfirm
	}
	const handleDesktopButtonClick = useCallback(() => {
		if (step <= 2) {
			nextStep()
			return
		}
		if (step === 3) {
			stepCustomerRef.current?.submitForConfirm(handleConfirm)
			return
		}
		handleConfirm()
	}, [step, nextStep, handleConfirm])

	const getMobileButtonLabel = () => {
		if (step <= 3) return t('next')
		return t('confirmBooking')
	}
	const getMobileCanProceed = () => {
		if (step <= 2) return !!canNextStep12
		if (step === 3) return !!canNextStep3
		return hasContactBasics && notifyOk
	}
	const handleMobileButtonClick = useCallback(async () => {
		if (step <= 2) {
			nextStep()
			return
		}
		if (step === 3) {
			const ok = await stepCustomerRef.current?.submitForSave()
			if (ok) nextStep()
			return
		}
		handleConfirm()
	}, [step, nextStep, handleConfirm])

	if (successMessage) {
		let title = t('bookingConfirmed')
		let bookedServices: { leaf: string; full: string }[] = []
		let fullDayCount: number | undefined
		try {
			const parsed = JSON.parse(successMessage)
			title = parsed.title ?? title
			bookedServices = Array.isArray(parsed.services)
				? parsed.services.filter(
						(s: unknown): s is { leaf: string; full: string } =>
							!!s &&
							typeof (s as { leaf?: unknown }).leaf === 'string' &&
							typeof (s as { full?: unknown }).full === 'string',
					)
				: []
			const n = Number(parsed.fullDayCount)
			fullDayCount = Number.isFinite(n) && n >= 1 ? Math.min(14, n) : undefined
		} catch {
			title = successMessage
		}
		return (
			<motion.div
				className='flex-1 flex items-center justify-center p-6 sm:p-8'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<motion.div
					className='text-center space-y-6 max-w-md'
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.35,
						delay: 0.1,
						ease: [0.25, 0.46, 0.45, 0.94],
					}}
				>
					<p className='font-serif text-xl sm:text-2xl text-icyWhite'>
						{title}
					</p>
					{bookedServices.length > 0 && (
						<ul className='space-y-2.5 text-left mx-auto max-w-sm'>
							{bookedServices.map((s, i) => {
								const showFullPath =
									s.full && s.full !== s.leaf && s.full.length > s.leaf.length
								return (
									<li
										key={`${s.full}-${i}`}
										className='rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5'
									>
										<p className='text-icyWhite/90 text-base leading-snug break-words'>
											{s.leaf}
										</p>
										{showFullPath && (
											<p className='text-icyWhite/50 text-xs leading-snug mt-0.5 break-words'>
												{s.full}
											</p>
										)}
									</li>
								)
							})}
						</ul>
					)}
					{fullDayCount != null && (
						<p className='text-icyWhite/70 text-sm'>
							{t('successFullDayScope', { count: fullDayCount })}
						</p>
					)}
					<button
						type='button'
						onClick={() => router.push(`/${locale}`)}
						className={accent.successBtn}
					>
						{t('backToWebsite')}
					</button>
				</motion.div>
			</motion.div>
		)
	}

	const progressStep = step === 4 ? 3 : step

	return (
		<div className='flex flex-col h-full min-h-0 md:min-h-[420px]'>
			{/* Progress — static top */}
			<div className='shrink-0'>
				<BookingStepProgress currentStep={progressStep} place={place} />
			</div>

			{/* Body: main + sidebar — tablet/laptop: row; mobile: column, full height to bottom button */}
			<div className='flex-1 flex min-h-0 md:flex-row flex-col overflow-hidden'>
				{/* Main content — full width mobile, flex-1 tablet+ */}
				<main
					className='flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden'
					/*
					 * Reserve exactly the fixed bottom bar's height. A constant used to
					 * work when the bar was a single button, but the cart strip made it
					 * taller and it started covering the time picker. The bar is
					 * `md:hidden`, so on desktop it measures 0 and this is a no-op.
					 */
					style={{ paddingBottom: bottomBarHeight }}
				>
					<div className='px-4 py-2 sm:px-5 flex-shrink-0 flex items-center justify-between gap-3 sm:gap-4'>
						<button
							type='button'
							onClick={handleBack}
							className='flex items-center gap-1.5 text-icyWhite/60 hover:text-icyWhite text-sm font-medium transition-colors shrink-0 min-h-[44px] pl-0 pr-1 py-0 md:py-2 -ml-1 rounded-lg active:bg-white/5 touch-manipulation'
							aria-label={leavesFlowOnBack ? t('cancel') : t('back')}
						>
							<svg
								className='w-5 h-5 shrink-0'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M15 19l-7-7 7-7'
								/>
							</svg>
							<span>{leavesFlowOnBack ? t('cancel') : t('back')}</span>
						</button>
						{step === 1 &&
							priceCatalog &&
							(priceCatalog.man.services?.length ||
								priceCatalog.woman.services?.length) && (
								<div className='flex-1 min-w-0 max-w-[240px] sm:max-w-[280px] relative'>
									<SearchIcon
										className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-icyWhite/50 pointer-events-none'
										aria-hidden
									/>
									<Input
										type='search'
										variant='search'
										value={searchQuery}
										onChange={e => setSearchQuery(e.target.value)}
										placeholder={t('searchServicePlaceholder')}
										aria-label={t('searchServicePlaceholder')}
										className='text-base sm:text-sm py-2.5 sm:py-3'
									/>
								</div>
							)}
					</div>

					<div className='flex-1 min-h-0 flex flex-col overflow-hidden px-4 sm:px-5 pb-4 sm:pb-5'>
						<div className='flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 md:p-5'>
							{/*
							  No `mode='wait'`: with `mode='wait'` framer waits for exit before
							  the next step enters → an empty gap is visible on slow phones.
							  Instead: snappy cross-fade (opacity only, no slide) — the slide
							  used to add visual jank on narrow viewports without payoff.
							*/}
							<AnimatePresence initial={false}>
								{step <= 2 &&
								priceCatalog &&
								(priceCatalog.man.services?.length ||
									priceCatalog.woman.services?.length) ? (
									<motion.div
										key='step-price-catalog'
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15, ease: 'easeOut' }}
										className='flex-1 min-h-0 w-full min-w-0 flex flex-col overflow-x-hidden'
									>
										<StepServiceFromPriceCatalog
											ref={stepCatalogRef}
											place={place}
											accent={accent}
											catalog={priceCatalog}
											services={services}
											searchQuery={searchQuery}
											setSearchQuery={setSearchQuery}
											onCanGoBackChange={setCatalogCanGoBack}
										/>
									</motion.div>
								) : step <= 2 ? (
									<motion.div
										key='step-service-date'
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15, ease: 'easeOut' }}
										className='flex-1 min-h-0 w-full min-w-0 flex flex-col overflow-x-hidden'
									>
										<StepServiceAndDate services={services} place={place} />
									</motion.div>
								) : null}
								{step === 3 && (
									<motion.div
										key='step-customer'
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15, ease: 'easeOut' }}
										// `min-w-0` + explicit `overflow-x-hidden` stop long labels/
										// translations (notably English copy on narrow phones) from
										// pushing the form wider than the viewport and clipping
										// content on the left edge.
										className='flex flex-col min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden'
									>
										<StepCustomerInfo
											ref={stepCustomerRef}
											place={place}
											onSubmit={handleConfirm}
											isSubmitting={isSubmitting}
											onValidityChange={setFormValid}
										/>
									</motion.div>
								)}
								{/* Mobile step 4: full booking summary (review before confirm) */}
								{step === 4 && (
									<motion.div
										key='step-mobile-review'
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15, ease: 'easeOut' }}
										className='flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden md:hidden'
									>
										<BookingSidebar />
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</main>

				{/* Sidebar — tablet (md) and laptop: visible. Mobile: hidden for steps 1–3, step 4 shows summary in main */}
				<aside className='hidden md:flex w-80 lg:w-96 shrink-0 flex-col border-l border-white/10 min-h-0'>
					<div className='flex-1 min-h-0 overflow-y-auto'>
						<BookingSidebar />
					</div>
					<div className='p-4 lg:p-5 border-t border-white/10 flex-shrink-0'>
						<button
							type='button'
							onClick={handleDesktopButtonClick}
							disabled={!getDesktopCanProceed() || isSubmitting}
							className={`w-full py-3 sm:py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
								getDesktopCanProceed() && !isSubmitting
									? accent.btnPrimaryDesktop
									: 'bg-white/10 text-icyWhite/40 cursor-not-allowed'
							}`}
						>
							{step >= 3 && isSubmitting
								? t('bookingInProgress')
								: getDesktopButtonLabel()}
						</button>
					</div>
				</aside>
			</div>

			{/* Mobile-only: fixed bottom bar — steps 1–4. The cart digest sits above
			    the CTA so "what am I booking and how long is it" is always on screen
			    without scrolling, and tapping it opens the editable list. */}
			<div
				ref={bottomBarRef}
				className='md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-nearBlack/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0)]'
			>
				{items.length > 0 && step <= 2 && (
					<button
						type='button'
						onClick={() => setMobileCartOpen(true)}
						aria-expanded={mobileCartOpen}
						className='w-full flex items-center justify-between gap-3 px-4 py-2.5 min-h-[44px] border-b border-white/10 text-left active:bg-white/5 transition-colors touch-manipulation'
					>
						<span className='flex items-center gap-2 min-w-0 text-sm text-icyWhite'>
							<span
								className={`shrink-0 inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold ${accent.pillActive}`}
							>
								{items.length}
							</span>
							<BookingCartSummaryLine
								items={items}
								durationMinutes={durationMinutes}
							/>
						</span>
						<span className='flex items-center gap-1.5 shrink-0 text-xs text-icyWhite/60'>
							{mobileCartPrice}
							<ChevronUp className='size-4' aria-hidden />
						</span>
					</button>
				)}
				<div className='px-4 py-3 sm:py-4'>
					<button
						type='button'
						onClick={handleMobileButtonClick}
						disabled={!getMobileCanProceed() || (step === 4 && isSubmitting)}
						className={`w-full min-h-[48px] sm:min-h-[52px] py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
							getMobileCanProceed() && !(step === 4 && isSubmitting)
								? accent.btnPrimaryMobile
								: 'bg-white/10 text-icyWhite/40 cursor-not-allowed'
						}`}
					>
						{step === 4 && isSubmitting
							? t('bookingInProgress')
							: getMobileButtonLabel()}
					</button>
				</div>
			</div>

			{/* Mobile cart sheet — full list with per-line removal. */}
			<AnimatePresence>
				{mobileCartOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.18 }}
							onClick={() => setMobileCartOpen(false)}
							className='md:hidden fixed inset-0 z-40 bg-nearBlack/70 backdrop-blur-sm'
							aria-hidden
						/>
						<motion.div
							role='dialog'
							aria-modal='true'
							aria-label={t('bookingSummary')}
							initial={{ y: '100%' }}
							animate={{ y: 0 }}
							exit={{ y: '100%' }}
							transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
							className='md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-white/15 bg-nearBlack max-h-[80vh] flex flex-col pb-[env(safe-area-inset-bottom,0)]'
						>
							<div className='flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0'>
								<h3 className='font-serif text-base font-semibold text-icyWhite'>
									{tCommon('services')}
								</h3>
								<button
									type='button'
									onClick={() => setMobileCartOpen(false)}
									aria-label={t('close')}
									className='p-2 -mr-2 rounded-lg text-icyWhite/60 hover:text-icyWhite active:bg-white/10 transition-colors touch-manipulation'
								>
									<X className='size-5' aria-hidden />
								</button>
							</div>
							<div className='flex-1 min-h-0 overflow-y-auto px-4 py-4'>
								<BookingCartList items={items} onRemove={removeItem} />
							</div>
							<div className='px-4 py-3 border-t border-white/10 shrink-0'>
								<BookingCartTotals
									items={items}
									durationMinutes={durationMinutes}
									priceTotal={priceTotal}
								/>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}

export default function BookingFlow(props: BookingFlowProps) {
	return (
		<BookingFlowProvider
			services={props.services}
			defaultDuration={props.defaultDuration}
			defaultService={props.defaultService ?? props.services[0]?.title}
			skipDraftRestore={props.skipDraftRestore}
			place={props.place}
		>
			<BookingFlowInner {...props} />
		</BookingFlowProvider>
	)
}

export { BookingFlowProvider, useBookingFlow }
export type { BookingFlowState, BookingGranularity } from './BookingFlowContext'
