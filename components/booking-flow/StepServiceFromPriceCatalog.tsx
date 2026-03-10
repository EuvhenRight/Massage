'use client'

import {
	getPrepBufferMinutes,
	parseOccupiedSlots,
	type OccupiedSlot,
} from '@/lib/availability-firestore'
import { db } from '@/lib/firebase'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import {
	getDescriptionForLocale,
	getTitleForLocale,
	type PriceCatalogStructure,
	type PriceLocale,
	type SexKey,
	type ZonePriceItem,
} from '@/types/price-catalog'
import {
	collection,
	getDocs,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useBookingFlow } from './BookingFlowContext'
import PublicDatePicker from './PublicDatePicker'
import TimeSlotPicker from './TimeSlotPicker'

interface StepServiceFromPriceCatalogProps {
	place: Place
	catalog: PriceCatalogStructure | null
	services: { title: string; durationMinutes?: number }[]
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
					zoneList.push({ zoneId: zone.id, zoneTitle, items: zoneItems })
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

export default function StepServiceFromPriceCatalog({
	place,
	catalog,
	services,
	searchQuery,
	setSearchQuery,
}: StepServiceFromPriceCatalogProps) {
	const t = useTranslations('booking')
	const tPrice = useTranslations('price')
	const priceLocale = (useLocale() || 'en') as PriceLocale

	const {
		step,
		service,
		setService,
		date,
		setDate,
		setTime,
		time,
		durationMinutes,
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

	const [selectedSex, setSelectedSex] = useState<SexKey | null>(null)
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
		let cancelled = false
		async function fetchAppointments() {
			setLoading(true)
			try {
				const start = new Date(year, monthNum, 1)
				const end = new Date(year, monthNum + 1, 0)
				end.setHours(23, 59, 59, 999)
				const q = query(
					collection(db, 'appointments'),
					where('place', '==', place),
					where('startTime', '>=', start),
					where('startTime', '<=', end),
				)
				const snapshot = await getDocs(q)
				if (cancelled) return
				const appointments = snapshot.docs.map(docSnap => {
					const d = docSnap.data()
					return {
						startTime: d.startTime as Timestamp,
						endTime: d.endTime as Timestamp,
					}
				})
				setOccupiedSlots(
					parseOccupiedSlots(appointments, getPrepBufferMinutes(schedule)),
				)
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
	}, [year, monthNum, place, schedule])

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

	const effectiveSectionId = activeSectionId || sections[0]?.sectionId || ''

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
				return { ...sec, zones }
			})
			.filter(sec => sec.zones.length > 0)
	}, [sections, searchQuery, priceLocale])

	useEffect(() => {
		if (sections.length > 0 && !activeSectionId) {
			setActiveSectionId(sections[0].sectionId)
		}
	}, [sections, activeSectionId])

	useEffect(() => {
		if (!catalog) return
		const hasW = (catalog.woman.services?.length ?? 0) > 0
		const hasM = (catalog.man.services?.length ?? 0) > 0
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
	}, [catalog])

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

	const handleItemClick = (fullTitle: string) => {
		setService(service === fullTitle ? '' : fullTitle)
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

	if (
		!catalog ||
		(catalog.man.services.length === 0 && catalog.woman.services.length === 0)
	) {
		return null
	}

	const hasMan = (catalog.man.services?.length ?? 0) > 0
	const hasWoman = (catalog.woman.services?.length ?? 0) > 0

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.2 }}
			className='flex flex-col flex-1 min-h-0'
		>
			{/* Step 1: Service selection
						Layout: Man/Woman + Choose + Section + Zone = fixed (flex-shrink-0)
						Items list = only scrollable area (flex-1 overflow-y-auto) */}
			{step === 1 && (
				<div className='flex flex-col flex-1 min-h-0'>
					{/* Man/Woman: shown when zone closed; hidden when zone open to free space */}
					<div className='flex-shrink-0 space-y-4'>
						{(hasMan || hasWoman) && !openZoneId && (
							<div className='grid grid-cols-2 gap-2 sm:gap-3'>
								{hasWoman && (
									<button
										type='button'
										onClick={() => {
											setSelectedSex('woman')
											setActiveServiceId(null)
											setService('')
											setActiveSectionId('')
											setOpenZoneId(null)
										}}
										className={`min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] ${
											selectedSex === 'woman'
												? 'bg-gold-soft text-nearBlack'
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
											setSelectedSex('man')
											setActiveServiceId(null)
											setService('')
											setActiveSectionId('')
											setOpenZoneId(null)
										}}
										className={`min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] ${
											selectedSex === 'man'
												? 'bg-gold-soft text-nearBlack'
												: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
										}`}
									>
										{tPrice('man')}
									</button>
								)}
							</div>
						)}

						{servicesForSex.length > 0 && !activeServiceId && !isSearching && (
							<div className='space-y-2'>
								<label className='block text-sm font-medium text-icyWhite/90'>
									{t('chooseServiceLabel')}
								</label>
								<div className={`grid ${sectionGridCols} gap-2 sm:gap-3`}>
									{servicesForSex.map(svc => (
										<button
											key={svc.id}
											type='button'
											onClick={() => {
												setActiveServiceId(svc.id)
												setService('')
												setActiveSectionId('')
												setOpenZoneId(null)
											}}
											className='min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
										>
											{getTitleForLocale(svc, priceLocale)}
										</button>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Section + Zone: fixed, no scroll. Items list: only scrollable. */}
					{selectedSex && (activeServiceId || isSearching) && (
						<div className='flex-1 min-h-0 flex flex-col mt-4'>
							{/* Sections — fixed */}
							{!isSearching && (
								<div
									className={`grid ${sectionGridCols} gap-2 sm:gap-3 flex-shrink-0 mb-3`}
								>
									{filteredSections.map(sec => (
										<motion.button
											key={sec.sectionId}
											type='button'
											onClick={() => {
												setActiveSectionId(sec.sectionId)
												setOpenZoneId(null)
											}}
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.2 }}
											className={`min-h-[44px] sm:min-h-0 py-3 px-4 rounded-xl text-sm font-medium text-left transition-all touch-manipulation active:scale-[0.99] ${
												effectiveSectionId === sec.sectionId
													? 'bg-gold-soft text-nearBlack'
													: 'bg-white/5 text-icyWhite/80 hover:bg-white/10 active:bg-white/[0.12]'
											}`}
										>
											{sec.sectionTitle}
										</motion.button>
									))}
								</div>
							)}

							{/* Zones: header fixed; items list = only scrollable area */}
							<AnimatePresence mode='wait'>
								{(isSearching
									? filteredSections
									: filteredSections.filter(
											s => s.sectionId === effectiveSectionId,
										)
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
												<div className='flex-shrink-0 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-normal text-icyWhite'>
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
															className='text-gold-soft/90 hover:text-gold-soft text-xs font-medium mt-1.5 py-0.5 -ml-1 focus:outline-none focus:ring-2 focus:ring-gold-soft/40 focus:ring-offset-1 focus:ring-offset-transparent rounded'
														>
															{expandedSectionDescriptions.has(sec.sectionId)
																? t('showLess')
																: t('showMore')}
														</button>
													)}
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
															className={`border border-white/10 rounded-lg overflow-hidden ${
																isOpen
																	? 'flex-1 min-h-0 flex flex-col'
																	: 'flex-shrink-0'
															}`}
														>
															<button
																type='button'
																onClick={() =>
																	setOpenZoneId(isOpen ? null : zoneValue)
																}
																className='w-full min-h-[48px] flex items-center justify-between px-4 py-3 sm:py-2.5 hover:bg-white/5 active:bg-white/[0.07] text-icyWhite text-left text-sm font-medium flex-shrink-0 transition-colors touch-manipulation'
															>
																<span>{zone.zoneTitle}</span>
																<span className='text-icyWhite/70 text-base tabular-nums'>
																	{isOpen ? '−' : '+'}
																</span>
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
																					: getTitleForLocale(item, priceLocale)
																				const isSelected = service === fullTitle
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
																								handleItemClick(fullTitle)
																							}
																							onKeyDown={e => {
																								if (
																									e.key === 'Enter' ||
																									e.key === ' '
																								) {
																									e.preventDefault()
																									handleItemClick(fullTitle)
																								}
																							}}
																							className={`flex items-center justify-between gap-3 px-3 py-2.5 sm:py-2 rounded-lg border cursor-pointer transition-all touch-manipulation active:scale-[0.99] ${
																								isSelected
																									? 'border-gold-soft/50 bg-gold-soft/10'
																									: 'border-white/10 bg-white/5 hover:border-white/20 active:border-white/25'
																							}`}
																							whileTap={{
																								scale: 0.99,
																							}}
																						>
																							<div className='flex-1 min-w-0'>
																								{path && (
																									<p className='text-xs text-icyWhite/50 truncate mb-0.5'>
																										{path}
																									</p>
																								)}
																								<div className='flex items-center justify-between gap-2'>
																									<span className='font-medium text-icyWhite text-sm truncate'>
																										{getTitleForLocale(
																											item,
																											priceLocale,
																										)}
																									</span>
																									<span className='text-gold-soft/90 text-sm shrink-0'>
																										{formatPrice(item.price)} €
																									</span>
																								</div>
																								<div className='flex items-center gap-2 mt-0.5'>
																									<span className='text-icyWhite/55 text-xs'>
																										{item.durationMinutes}{' '}
																										{tPrice('min')}
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
																											className='text-gold-soft/80 text-xs hover:underline'
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
			{step === 2 && service && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
					className='flex flex-col flex-1 min-h-0'
				>
					<div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
						<PublicDatePicker
							selectedDate={date}
							onSelectDate={setDate}
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

			{loading && (
				<p className='text-xs text-icyWhite/50'>{t('loadingAvailability')}</p>
			)}
		</motion.div>
	)
}
