'use client'

import { TruncateText } from '@/components/ui/truncate-text'
import { fetchMergedPublicOccupiedSlots } from '@/lib/booking-occupied-slots'
import type { OccupiedSlot } from '@/lib/availability-firestore'
import type { BookingAccent } from '@/lib/booking-accent'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import {
	getDescriptionForLocale,
	getScheduleTbdAdminNoteForLocale,
	getScheduleTbdMessageForLocale,
	getTitleForLocale,
	normalizeItemBookingDayCount,
	type PriceCatalogStructure,
	type PriceLocale,
	type SexKey,
	type ZonePriceItem,
} from '@/types/price-catalog'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { getEffectivePriceForBooking } from '@/lib/price-catalog-price-display'
import { findBookableServiceForSelection } from '@/lib/services'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useBookingFlow } from './BookingFlowContext'
import PublicDatePicker from './PublicDatePicker'
import TbdBookingRecap from './TbdBookingRecap'
import TimeSlotPicker from './TimeSlotPicker'

export interface StepServiceFromPriceCatalogHandle {
	/** Walk back one sub-step within step 1; returns true when the catalog handled it. */
	handleSubStepBack: () => boolean
}

interface StepServiceFromPriceCatalogProps {
	place: Place
	accent: BookingAccent
	catalog: PriceCatalogStructure | null
	services: {
		title: string
		durationMinutes?: number
		bookingGranularity?: 'time' | 'day' | 'tbd'
		bookingDayCount?: number
	}[]
	searchQuery: string
	setSearchQuery: (q: string) => void
}

function formatPrice(price: number | string): string {
	if (typeof price === 'number') return `${price}`
	return String(price)
}

const PREVIEW_LINES = 2
const PREVIEW_LINE_HEIGHT = 1.4

/** Section description: default show 30% of text; "Show more" reveals 100% */
const SECTION_DESC_PREVIEW_RATIO = 0.3
const SECTION_DESC_MIN_LENGTH = 60

interface CatalogSection {
	sectionId: string
	sectionTitle: string
	sectionDescription: string
	zones: Array<{
		zoneId: string
		zoneTitle: string
		items: Array<{ item: ZonePriceItem; path: string }>
	}>
}

/** Build sections with zones for display; optional serviceId = only that service */
function buildSectionsWithZones(
	catalog: PriceCatalogStructure,
	locale: PriceLocale,
	sex: SexKey,
	serviceId?: string | null,
): CatalogSection[] {
	const sections: CatalogSection[] = []
	const branch = catalog[sex]
	if (!branch?.services?.length) return sections

	const servicesToUse = serviceId
		? branch.services.filter(s => s.id === serviceId)
		: branch.services

	function addSection(
		secId: string,
		secTitle: string,
		secDesc: string,
		zones: CatalogSection['zones'],
	) {
		if (zones.length === 0) return
		sections.push({
			sectionId: secId,
			sectionTitle: secTitle,
			sectionDescription: secDesc,
			zones,
		})
	}

	for (const svc of servicesToUse) {
		const svcTitle = getTitleForLocale(svc, locale)
		const secs = svc.sections ?? []
		const zones = svc.zones ?? []
		const items = svc.items ?? []

		if (secs.length > 0) {
			for (const sec of secs) {
				const secTitle = getTitleForLocale(sec, locale)
				const secDesc = getDescriptionForLocale(sec, locale)
				const zoneList: CatalogSection['zones'] = []
				for (const zone of sec.zones ?? []) {
					const zoneTitle = getTitleForLocale(zone, locale)
					const path = `${svcTitle} › ${secTitle} › ${zoneTitle}`
					const zoneItems = (zone.items ?? []).map(item => ({ item, path }))
					zoneList.push({
						zoneId: zone.id,
						zoneTitle,
						items: zoneItems,
					})
				}
				addSection(sec.id, secTitle, secDesc, zoneList)
			}
		} else if (zones.length > 0) {
			const zoneList: CatalogSection['zones'] = zones.map(zone => ({
				zoneId: zone.id,
				zoneTitle: getTitleForLocale(zone, locale),
				items: (zone.items ?? []).map(item => ({
					item,
					path: `${svcTitle} › ${getTitleForLocale(zone, locale)}`,
				})),
			}))
			addSection(
				svc.id,
				svcTitle,
				getDescriptionForLocale(svc, locale),
				zoneList,
			)
		} else if (items.length > 0) {
			addSection(
				`${svc.id}-items`,
				svcTitle,
				getDescriptionForLocale(svc, locale),
				[
					{
						zoneId: `${svc.id}-items`,
						zoneTitle: svcTitle,
						items: items.map(item => ({ item, path: svcTitle })),
					},
				],
			)
		}
	}
	return sections
}

const StepServiceFromPriceCatalog = forwardRef<
	StepServiceFromPriceCatalogHandle,
	StepServiceFromPriceCatalogProps
>(function StepServiceFromPriceCatalog(
	{ place, accent, catalog, services, searchQuery, setSearchQuery },
	ref,
) {
	const t = useTranslations('booking')
	const tPrice = useTranslations('price')
	const priceLocale = (useLocale() || 'en') as PriceLocale

	const searchParams = useSearchParams()
	const fromServicesGrid = searchParams.get('from') === 'services'
	const fromPresetDeepLink =
		searchParams.get('from') === 'price' || fromServicesGrid
	const categoryParam = searchParams.get('category')
	const serviceTitleParam = searchParams.get('service')
	const sexParam = searchParams.get('sex') as SexKey | null
	const autoAdvancedFromPresetRef = useRef(false)

	useEffect(() => {
		if (!fromPresetDeepLink) autoAdvancedFromPresetRef.current = false
	}, [fromPresetDeepLink])

	const {
		step,
		service,
		setService,
		setCatalogSex,
		setStep,
		date,
		setDate,
		setTime,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		scheduleTbdCustomerMessage,
		catalogSex,
	} = useBookingFlow()

	const [month, setMonth] = useState(() => {
		const d = date ?? new Date()
		return new Date(d.getFullYear(), d.getMonth(), 1)
	})
	const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([])
	const [schedule, setSchedule] = useState<Awaited<
		ReturnType<typeof getSchedule>
	> | null>(null)
	const [loading, setLoading] = useState(true)
	/** Bumped when the tab becomes visible again so occupancy refetches after admin changes. */
	const [occupancyRefreshTick, setOccupancyRefreshTick] = useState(0)

	useEffect(() => {
		const onVis = () => {
			if (document.visibilityState === 'visible') {
				setOccupancyRefreshTick(t => t + 1)
			}
		}
		document.addEventListener('visibilitychange', onVis)
		return () => document.removeEventListener('visibilitychange', onVis)
	}, [])

	const handleSelectDate = useCallback(
		(d: Date) => {
			setDate(d)
		},
		[setDate],
	)

	const [selectedSex, setSelectedSex] = useState<SexKey | null>(
		() => catalogSex ?? null,
	)
	const urlSexAppliedRef = useRef(false)

	useEffect(() => {
		setCatalogSex(selectedSex)
	}, [selectedSex, setCatalogSex])

	useEffect(() => {
		urlSexAppliedRef.current = false
	}, [sexParam])

	const [activeServiceId, setActiveServiceId] = useState<string | null>(null)
	const [activeSectionId, setActiveSectionId] = useState<string>('')
	const [openZoneId, setOpenZoneId] = useState<string | null>(null)
	const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
		new Set(),
	)
	const [expandedSectionDescriptions, setExpandedSectionDescriptions] =
		useState<Set<string>>(new Set())

	const year = month.getFullYear()
	const monthNum = month.getMonth()

	useEffect(() => {
		getSchedule(place)
			.then(setSchedule)
			.catch(() => setSchedule(null))
	}, [place])

	useEffect(() => {
		if (step === 2 && bookingGranularity === 'tbd') {
			setOccupiedSlots([])
			setLoading(false)
			return
		}
		let cancelled = false
		async function fetchAppointments() {
			setLoading(true)
			try {
				const rangeStart = new Date(year, monthNum, 1)
				const rangeEnd = new Date(year, monthNum + 1, 0)
				rangeEnd.setHours(23, 59, 59, 999)
				const merged = await fetchMergedPublicOccupiedSlots(
					place,
					rangeStart,
					rangeEnd,
					schedule,
				)
				if (cancelled) return
				setOccupiedSlots(merged)
			} catch {
				setOccupiedSlots([])
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		fetchAppointments()
		return () => {
			cancelled = true
		}
	}, [year, monthNum, place, schedule, step, bookingGranularity, occupancyRefreshTick])

	const servicesForSex = useMemo(() => {
		if (!catalog || !selectedSex) return []
		return catalog[selectedSex]?.services ?? []
	}, [catalog, selectedSex])

	const sections = useMemo(() => {
		if (!catalog || !selectedSex) return []
		return buildSectionsWithZones(
			catalog,
			priceLocale,
			selectedSex,
			activeServiceId,
		)
	}, [catalog, priceLocale, selectedSex, activeServiceId])

	const activeServiceTitle = useMemo(() => {
		if (!activeServiceId) return ''
		const svc = servicesForSex.find(s => s.id === activeServiceId)
		return svc ? getTitleForLocale(svc, priceLocale) : ''
	}, [activeServiceId, servicesForSex, priceLocale])

	const activeSectionTitle = useMemo(() => {
		const sec = sections.find(s => s.sectionId === activeSectionId)
		return sec?.sectionTitle ?? ''
	}, [sections, activeSectionId])

	const filteredSections = useMemo(() => {
		if (!searchQuery.trim()) {
			return sections
		}
		const q = searchQuery.trim().toLowerCase()
		return sections
			.map(sec => {
				const zones = sec.zones
					.map(z => ({
						...z,
						items: z.items.filter(({ item }) => {
							const title = getTitleForLocale(item, priceLocale).toLowerCase()
							return title.includes(q)
						}),
					}))
					.filter(z => z.items.length > 0)
				return {
					...sec,
					zones,
				}
			})
			.filter(sec => sec.zones.length > 0)
	}, [sections, searchQuery, priceLocale])

	/**
	 * Tracks the substeps the user explicitly backed out of, so auto-skips don't
	 * immediately throw them forward into the substep they just left.
	 * Reset when the user makes a forward pick on the upstream substep.
	 */
	const userBackedRef = useRef<{
		service: boolean
		section: boolean
		zone: boolean
	}>({ service: false, section: false, zone: false })

	// Auto-pick the only section so we don't make the user tap a single tile.
	useEffect(() => {
		if (userBackedRef.current.section) return
		if (sections.length === 1 && !activeSectionId) {
			setActiveSectionId(sections[0].sectionId)
		}
	}, [sections, activeSectionId])

	// Auto-open the only zone in the active section.
	const activeSection = useMemo(
		() => sections.find(s => s.sectionId === activeSectionId) ?? null,
		[sections, activeSectionId],
	)
	useEffect(() => {
		if (userBackedRef.current.zone) return
		if (!activeSection || openZoneId) return
		if (activeSection.zones.length === 1) {
			setOpenZoneId(`${activeSection.sectionId}-${activeSection.zones[0].zoneId}`)
		}
	}, [activeSection, openZoneId])

	useEffect(() => {
		if (!catalog) return
		const hasW = (catalog.woman.services?.length ?? 0) > 0
		const hasM = (catalog.man.services?.length ?? 0) > 0
		if (
			!urlSexAppliedRef.current &&
			(sexParam === 'woman' || sexParam === 'man')
		) {
			if (sexParam === 'woman' && hasW) {
				setSelectedSex('woman')
				urlSexAppliedRef.current = true
				return
			}
			if (sexParam === 'man' && hasM) {
				setSelectedSex('man')
				urlSexAppliedRef.current = true
				return
			}
		}
		setSelectedSex(prev => {
			if (prev !== null) {
				if (prev === 'woman' && !hasW && hasM) return 'man'
				if (prev === 'man' && !hasM && hasW) return 'woman'
				return prev
			}
			if (hasW && !hasM) return 'woman'
			if (hasM && !hasW) return 'man'
			return null
		})
	}, [catalog, sexParam])

	/** Service cards on landing: expand the matching top-level catalog service (by id or title). */
	useEffect(() => {
		if (!fromServicesGrid) return
		if (!catalog || selectedSex == null) return
		const branch = catalog[selectedSex]
		if (!branch?.services?.length) return
		if (categoryParam) {
			const byId = branch.services.find(s => s.id === categoryParam)
			if (byId) {
				setActiveServiceId(byId.id)
				return
			}
		}
		const st = serviceTitleParam?.trim()
		if (st) {
			const byTitle = branch.services.find(
				s => getTitleForLocale(s, priceLocale).trim() === st,
			)
			if (byTitle) setActiveServiceId(byTitle.id)
		}
	}, [
		fromServicesGrid,
		catalog,
		selectedSex,
		categoryParam,
		serviceTitleParam,
		priceLocale,
	])

	/** Deep link from price list or service cards: jump to date / time (or TBD) once service + sex are ready. */
	useEffect(() => {
		if (autoAdvancedFromPresetRef.current || !fromPresetDeepLink) return
		if (step !== 1) return
		if (!catalog) return
		const hasW = (catalog.woman.services?.length ?? 0) > 0
		const hasM = (catalog.man.services?.length ?? 0) > 0
		const needsSexPick = hasW && hasM
		if (needsSexPick && selectedSex == null) return
		const s = service.trim()
		if (!s) return
		if (!findBookableServiceForSelection(s, services)) return
		autoAdvancedFromPresetRef.current = true
		queueMicrotask(() => setStep(2))
	}, [
		fromPresetDeepLink,
		step,
		service,
		services,
		catalog,
		selectedSex,
		setStep,
	])

	const isSearching = searchQuery.trim().length > 0

	useEffect(() => {
		if (!searchQuery.trim()) {
			setOpenZoneId(null)
			return
		}
		if (filteredSections.length > 0) {
			const firstSec = filteredSections[0]
			if (firstSec.zones.length > 0) {
				setActiveSectionId(firstSec.sectionId)
				setOpenZoneId(`${firstSec.sectionId}-${firstSec.zones[0].zoneId}`)
			}
		}
	}, [searchQuery, filteredSections])

	const handleItemClick = (fullTitle: string, item: ZonePriceItem) => {
		if (service === fullTitle) {
			setService('')
			return
		}
		setService(fullTitle, {
			durationMinutes: item.durationMinutes,
			bookingGranularity: item.bookingGranularity,
			bookingDayCount: item.bookingDayCount,
			scheduleTbdCustomerMessage: getScheduleTbdMessageForLocale(
				item,
				priceLocale,
			),
			scheduleTbdAdminHint: getScheduleTbdAdminNoteForLocale(item, priceLocale),
		})
	}

	const toggleDescription = (e: React.MouseEvent, itemId: string) => {
		e.stopPropagation()
		setExpandedDescriptions(prev => {
			const next = new Set(prev)
			if (next.has(itemId)) next.delete(itemId)
			else next.add(itemId)
			return next
		})
	}

	const toggleSectionDescription = (e: React.MouseEvent, sectionId: string) => {
		e.stopPropagation()
		setExpandedSectionDescriptions(prev => {
			const next = new Set(prev)
			if (next.has(sectionId)) next.delete(sectionId)
			else next.add(sectionId)
			return next
		})
	}

	// Mobile: 1 col; tablet/laptop: 2 cols (same layout for tablet as laptop)
	const sectionGridCols = 'grid-cols-1 md:grid-cols-2'

	const hasMan = (catalog?.man.services?.length ?? 0) > 0
	const hasWoman = (catalog?.woman.services?.length ?? 0) > 0
	const needsSexPick = hasMan && hasWoman

	/**
	 * Progressive disclosure: one sub-step is visible at a time so users aren't
	 * overwhelmed with the full sex → service → section → zone tree. Search
	 * bypasses this and shows all matching items inline.
	 */
	type SubStep = 'sex' | 'service' | 'section' | 'zone'
	const subStep: SubStep = isSearching
		? 'zone'
		: needsSexPick && !selectedSex
			? 'sex'
			: !activeServiceId && servicesForSex.length > 1
				? 'service'
				: !activeSectionId && sections.length > 1
					? 'section'
					: 'zone'

	// Auto-pick the only service so single-service catalogs don't show a 1-tile picker.
	useEffect(() => {
		if (userBackedRef.current.service) return
		if (!selectedSex) return
		if (activeServiceId) return
		if (servicesForSex.length === 1) {
			setActiveServiceId(servicesForSex[0].id)
		}
	}, [selectedSex, activeServiceId, servicesForSex])

	useImperativeHandle(
		ref,
		() => ({
			handleSubStepBack: () => {
				if (isSearching) {
					setSearchQuery('')
					return true
				}
				const requiresSectionPick = sections.length > 1
				const requiresServicePick = servicesForSex.length > 1
				const requiresSexPick = needsSexPick

				// Determine the conceptual prior substep based on what's currently visible.
				type Target = 'sex' | 'service' | 'section' | 'zone' | 'cancel'
				let target: Target = 'cancel'
				if (subStep === 'zone') {
					// Mid-step interaction: close the open zone first when there are siblings.
					if (
						openZoneId &&
						activeSection &&
						activeSection.zones.length > 1
					) {
						setOpenZoneId(null)
						return true
					}
					target = requiresSectionPick
						? 'section'
						: requiresServicePick
							? 'service'
							: requiresSexPick
								? 'sex'
								: 'cancel'
				} else if (subStep === 'section') {
					target = requiresServicePick
						? 'service'
						: requiresSexPick
							? 'sex'
							: 'cancel'
				} else if (subStep === 'service') {
					target = requiresSexPick ? 'sex' : 'cancel'
				}

				if (target === 'cancel') return false

				if (target === 'sex') {
					userBackedRef.current.service = true
					userBackedRef.current.section = true
					userBackedRef.current.zone = true
					setSelectedSex(null)
					setActiveServiceId(null)
					setService('')
					setActiveSectionId('')
					setOpenZoneId(null)
					return true
				}
				if (target === 'service') {
					userBackedRef.current.section = true
					userBackedRef.current.zone = true
					setActiveServiceId(null)
					setService('')
					setActiveSectionId('')
					setOpenZoneId(null)
					return true
				}
				// target === 'section'
				userBackedRef.current.zone = true
				setActiveSectionId('')
				setOpenZoneId(null)
				return true
			},
		}),
		[
			isSearching,
			openZoneId,
			activeSection,
			subStep,
			needsSexPick,
			sections.length,
			servicesForSex.length,
			setSearchQuery,
			setService,
		],
	)

	if (
		!catalog ||
		(catalog.man.services.length === 0 && catalog.woman.services.length === 0)
	) {
		return null
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.2 }}
			className='flex flex-col flex-1 min-h-0'
		>
			{/* Step 1: Service selection — one substep visible at a time.
						Layout: header pickers = fixed (flex-shrink-0);
						items list = only scrollable area (flex-1 overflow-y-auto). */}
			{step === 1 && (
				<div className='flex flex-col flex-1 min-h-0'>
					{/* Breadcrumb of the user's prior picks. Only segments where the
					     user had a real choice are shown; tapping a segment jumps back
					     to that substep to change the pick. */}
					{!isSearching &&
						(subStep === 'service' ||
							subStep === 'section' ||
							subStep === 'zone') && (
							<nav
								aria-label={t('bookingProgress')}
								className='flex-shrink-0 mb-3 flex items-center gap-1.5 text-xs sm:text-sm flex-wrap text-icyWhite/70'
							>
								{selectedSex && needsSexPick && (
									<button
										type='button'
										onClick={() => {
											userBackedRef.current.service = true
											userBackedRef.current.section = true
											userBackedRef.current.zone = true
											setSelectedSex(null)
											setActiveServiceId(null)
											setService('')
											setActiveSectionId('')
											setOpenZoneId(null)
										}}
										className='underline-offset-2 hover:underline hover:text-icyWhite transition-colors min-h-[28px] px-1 -mx-1'
									>
										{tPrice(selectedSex)}
									</button>
								)}
								{activeServiceTitle && servicesForSex.length > 1 && (
									<>
										{selectedSex && needsSexPick && (
											<span className='text-icyWhite/40' aria-hidden>
												›
											</span>
										)}
										<button
											type='button'
											onClick={() => {
												userBackedRef.current.section = true
												userBackedRef.current.zone = true
												setActiveServiceId(null)
												setService('')
												setActiveSectionId('')
												setOpenZoneId(null)
											}}
											className='underline-offset-2 hover:underline hover:text-icyWhite transition-colors min-h-[28px] px-1 -mx-1 truncate max-w-[40vw] sm:max-w-none'
										>
											{activeServiceTitle}
										</button>
									</>
								)}
								{activeSectionTitle && sections.length > 1 && (
									<>
										<span className='text-icyWhite/40' aria-hidden>
											›
										</span>
										<button
											type='button'
											onClick={() => {
												userBackedRef.current.zone = true
												setActiveSectionId('')
												setOpenZoneId(null)
											}}
											className='underline-offset-2 hover:underline hover:text-icyWhite transition-colors min-h-[28px] px-1 -mx-1 truncate max-w-[40vw] sm:max-w-none'
										>
											{activeSectionTitle}
										</button>
									</>
								)}
							</nav>
						)}

					{/* SEX substep */}
					{subStep === 'sex' && (
						<div className='flex-shrink-0 space-y-2'>
							<div className='grid grid-cols-2 gap-2 sm:gap-3'>
								{hasWoman && (
									<button
										type='button'
										onClick={() => {
											userBackedRef.current.service = false
											userBackedRef.current.section = false
											userBackedRef.current.zone = false
											setSelectedSex('woman')
											setActiveServiceId(null)
											setService('')
											setActiveSectionId('')
											setOpenZoneId(null)
										}}
										className={`min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] ${
											selectedSex === 'woman'
												? accent.pillActive
												: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
										}`}
									>
										{tPrice('woman')}
									</button>
								)}
								{hasMan && (
									<button
										type='button'
										onClick={() => {
											userBackedRef.current.service = false
											userBackedRef.current.section = false
											userBackedRef.current.zone = false
											setSelectedSex('man')
											setActiveServiceId(null)
											setService('')
											setActiveSectionId('')
											setOpenZoneId(null)
										}}
										className={`min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] ${
											selectedSex === 'man'
												? accent.pillActive
												: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
										}`}
									>
										{tPrice('man')}
									</button>
								)}
							</div>
						</div>
					)}

					{/* SERVICE substep */}
					{subStep === 'service' && servicesForSex.length > 0 && (
						<div className='flex-shrink-0 space-y-2'>
							<label className='block text-sm font-medium text-icyWhite/90'>
								{t('chooseServiceLabel')}
							</label>
							<div className={`grid ${sectionGridCols} gap-2 sm:gap-3`}>
								{servicesForSex.map(svc => {
									const isActive = activeServiceId === svc.id
									return (
										<button
											key={svc.id}
											type='button'
											onClick={() => {
												userBackedRef.current.section = false
												userBackedRef.current.zone = false
												setActiveServiceId(svc.id)
												setService('')
												setActiveSectionId('')
												setOpenZoneId(null)
											}}
											className={`min-h-[44px] sm:min-h-0 py-3 px-3 sm:px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] flex items-center ${
												isActive
													? accent.pillActive
													: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
											}`}
											aria-pressed={isActive}
										>
											<TruncateText
												className='text-left flex-1 min-w-0'
												tooltipThreshold={25}
											>
												{getTitleForLocale(svc, priceLocale)}
											</TruncateText>
										</button>
									)
								})}
							</div>
						</div>
					)}

					{/* SECTION substep */}
					{subStep === 'section' && (
						<div className='flex-1 min-h-0 flex flex-col overflow-y-auto'>
							<div
								className={`grid ${sectionGridCols} gap-2 sm:gap-3 flex-shrink-0`}
							>
								{filteredSections.map(sec => (
									<motion.button
										key={sec.sectionId}
										type='button'
										onClick={() => {
											userBackedRef.current.zone = false
											setActiveSectionId(sec.sectionId)
											setOpenZoneId(null)
										}}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.2 }}
										className={clsx(
											'min-h-[44px] sm:min-h-0 py-3 px-3 sm:px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] flex items-center',
											activeSectionId === sec.sectionId
												? accent.sectionPillActive
												: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]',
										)}
									>
										<TruncateText
											className='text-left flex-1 min-w-0'
											tooltipThreshold={25}
										>
											{sec.sectionTitle}
										</TruncateText>
									</motion.button>
								))}
							</div>
							{filteredSections.length === 0 && (
								<p className='text-sm text-icyWhite/60 py-4 text-center'>
									{t('noServicesInCategory')}
								</p>
							)}
						</div>
					)}

					{/* ZONE substep (also used for search results) */}
					{subStep === 'zone' && (
						<div className='flex-1 min-h-0 flex flex-col overflow-y-auto'>
							<AnimatePresence mode='wait'>
								{(isSearching
									? filteredSections
									: filteredSections.filter(s => s.sectionId === activeSectionId)
								)
									.filter(
										sec =>
											!openZoneId ||
											sec.zones.some(
												z => openZoneId === `${sec.sectionId}-${z.zoneId}`,
											),
									)
									.map(sec => (
										<motion.div
											key={sec.sectionId}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.2 }}
											className='flex-1 min-h-0 flex flex-col gap-2'
										>
											{sec.sectionDescription && (
												<div
													className={clsx(
														'flex-shrink-0',
														openZoneId ? 'hidden md:block' : '',
													)}
												>
													<div className='w-full min-w-0 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-normal text-icyWhite'>
														<p className='break-words'>
															{expandedSectionDescriptions.has(sec.sectionId)
																? sec.sectionDescription
																: sec.sectionDescription.length >
																	  SECTION_DESC_MIN_LENGTH
																	? `${sec.sectionDescription
																			.slice(
																				0,
																				Math.max(
																					Math.floor(
																						sec.sectionDescription.length *
																							SECTION_DESC_PREVIEW_RATIO,
																					),
																					20,
																				),
																			)
																			.trim()}\u2026`
																	: sec.sectionDescription}
														</p>
														{sec.sectionDescription.length >
															SECTION_DESC_MIN_LENGTH && (
															<button
																type='button'
																onClick={e =>
																	toggleSectionDescription(e, sec.sectionId)
																}
																aria-expanded={expandedSectionDescriptions.has(
																	sec.sectionId,
																)}
																aria-label={
																	expandedSectionDescriptions.has(sec.sectionId)
																		? t('showLess')
																		: t('showMore')
																}
																className={accent.showMoreLink}
															>
																{expandedSectionDescriptions.has(sec.sectionId)
																	? t('showLess')
																	: t('showMore')}
															</button>
														)}
													</div>
												</div>
											)}
											{sec.zones
												.filter(
													zone =>
														!openZoneId ||
														openZoneId === `${sec.sectionId}-${zone.zoneId}`,
												)
												.map(zone => {
													const zoneValue = `${sec.sectionId}-${zone.zoneId}`
													const isOpen = openZoneId === zoneValue
													return (
														<div
															key={zone.zoneId}
															className={clsx(
																'border border-white/10 rounded-lg overflow-hidden flex flex-col',
																isOpen ? 'flex-1 min-h-0' : 'flex-shrink-0',
															)}
														>
															<div
																className={clsx(
																	'min-w-0 flex-1 flex flex-col',
																	isOpen ? 'flex-1 min-h-0' : '',
																)}
															>
																<button
																	type='button'
																	onClick={() =>
																		setOpenZoneId(isOpen ? null : zoneValue)
																	}
																	aria-expanded={isOpen}
																	className='w-full min-h-[48px] flex items-center justify-between px-3 sm:px-4 py-3 sm:py-2.5 hover:bg-white/5 active:bg-white/[0.07] text-icyWhite text-left text-sm font-medium flex-shrink-0 transition-colors touch-manipulation'
																>
																	<span className='flex-1 min-w-0 text-left'>
																		<TruncateText tooltipThreshold={20}>
																			{zone.zoneTitle}
																		</TruncateText>
																	</span>
																	{!isOpen && (
																		<span className='text-icyWhite/70 shrink-0 text-base'>
																			+
																		</span>
																	)}
																</button>
																{isOpen && (
																	<div className='flex-1 min-h-0 overflow-y-auto pt-3 pb-2 px-2'>
																		{zone.items.length === 0 ? (
																			<p className='text-sm text-icyWhite/50 py-4 text-center'>
																				{t('noServicesInCategory')}
																			</p>
																		) : (
																			<ul className='grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-1.5'>
																				{zone.items.map(({ item, path }) => {
																					const fullTitle = path
																						? `${path} › ${getTitleForLocale(item, priceLocale)}`
																						: getTitleForLocale(
																								item,
																								priceLocale,
																							)
																					const isSelected =
																						service === fullTitle
																					const desc = getDescriptionForLocale(
																						item,
																						priceLocale,
																					)
																					const isExpanded =
																						expandedDescriptions.has(item.id)
																					return (
																						<li key={item.id}>
																							<motion.div
																								role='button'
																								tabIndex={0}
																								onClick={() =>
																									handleItemClick(fullTitle, item)
																								}
																								onKeyDown={e => {
																									if (
																										e.key === 'Enter' ||
																										e.key === ' '
																									) {
																										e.preventDefault()
																										handleItemClick(fullTitle, item)
																									}
																								}}
																								className={`flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded-lg border cursor-pointer transition-all touch-manipulation active:scale-[0.99] ${
																									isSelected
																										? accent.itemSelected
																										: 'border-white/10 bg-white/5 hover:border-white/20 active:border-white/25'
																								}`}
																								whileTap={{
																									scale: 0.99,
																								}}
																							>
																								<div className='flex-1 min-w-0'>
																									{path && (
																										<p
																											className='text-xs text-icyWhite/50 truncate mb-0.5'
																											title={
																												path.length > 30
																													? path
																													: undefined
																											}
																										>
																											{path}
																										</p>
																									)}
																									<div className='flex items-center justify-between gap-2'>
																										<TruncateText
																											className='font-medium text-icyWhite text-sm flex-1 min-w-0'
																											tooltipThreshold={25}
																										>
																											{getTitleForLocale(
																												item,
																												priceLocale,
																											)}
																										</TruncateText>
																										<span
																											className={
																												accent.priceText
																											}
																										>
																											{formatPrice(
																												getEffectivePriceForBooking(
																													item,
																												) ?? item.price,
																											)}{' '}
																											€
																										</span>
																									</div>
																									<div className='flex items-center gap-2 mt-0.5'>
																										<span className='text-icyWhite/55 text-xs'>
																											{item.bookingGranularity ===
																												'tbd' ||
																											item.bookingGranularity ===
																												'day' ? (
																												<>
																													{t(
																														'scheduleTbdBookingBadge',
																													)}
																													<span className='text-icyWhite/45'>
																														{' '}
																														·{' '}
																														{t('allDayBadge', {
																															count:
																																normalizeItemBookingDayCount(
																																	item.bookingDayCount,
																																),
																														})}
																													</span>
																												</>
																											) : (
																												`${item.durationMinutes} ${tPrice('min')}`
																											)}
																										</span>
																										{desc && (
																											<button
																												type='button'
																												onClick={e =>
																													toggleDescription(
																														e,
																														item.id,
																													)
																												}
																												className={
																													accent.descLink
																												}
																											>
																												{isExpanded
																													? t('showLess')
																													: t('showMore')}
																											</button>
																										)}
																									</div>
																									{desc && isExpanded && (
																										<p className='mt-1.5 text-xs font-normal text-icyWhite whitespace-pre-wrap'>
																											{desc}
																										</p>
																									)}
																								</div>
																							</motion.div>
																						</li>
																					)
																				})}
																			</ul>
																		)}
																	</div>
																)}
															</div>
														</div>
													)
												})}
										</motion.div>
									))}
							</AnimatePresence>

							{filteredSections.length === 0 && step === 1 && (
								<p className='text-sm text-icyWhite/60 py-4 text-center'>
									{searchQuery
										? t('noSearchResults')
										: t('noServicesInCategory')}
								</p>
							)}
						</div>
					)}
				</div>
			)}

			{/* Calendar + time — step 2, fits in height, scrolls if needed */}
			{step === 2 && service && bookingGranularity === 'tbd' && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
					className='flex flex-col flex-1 min-h-0'
				>
					<TbdBookingRecap
						accent={accent}
						service={service}
						bookingDayCount={bookingDayCount}
					/>
					<p className='text-sm font-medium text-icyWhite mb-2'>
						{t('scheduleTbdCustomerHeading')}
					</p>
					<div
						className={`rounded-xl border px-4 py-3 text-sm text-icyWhite/85 whitespace-pre-wrap ${accent.inputBorder} bg-white/[0.03]`}
					>
						{scheduleTbdCustomerMessage.trim()
							? scheduleTbdCustomerMessage
							: t('scheduleTbdEmptyMessage')}
					</div>
				</motion.div>
			)}

			{step === 2 && service && bookingGranularity !== 'tbd' && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
					className='flex flex-col flex-1 min-h-0'
				>
					<div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
						<PublicDatePicker
							accent={accent}
							selectedDate={date}
							onSelectDate={handleSelectDate}
							occupiedSlots={occupiedSlots}
							durationMinutes={durationMinutes}
							month={month}
							onMonthChange={d =>
								setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
							}
							schedule={schedule}
						/>
					</div>
					{date && (
						<div className='flex-shrink-0 pt-4'>
							<TimeSlotPicker
								accent={accent}
								date={date}
								selectedTime={time}
								onSelectTime={setTime}
								occupiedSlots={occupiedSlots}
								durationMinutes={durationMinutes}
								schedule={schedule}
							/>
						</div>
					)}
				</motion.div>
			)}

			{loading && bookingGranularity !== 'tbd' && (
				<p className='text-xs text-icyWhite/50'>{t('loadingAvailability')}</p>
			)}
		</motion.div>
	)
})

export default StepServiceFromPriceCatalog
