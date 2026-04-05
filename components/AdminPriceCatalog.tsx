'use client'

import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import { isPriceSaleActive } from '@/lib/price-catalog-price-display'
import { normalizePriceCatalog } from '@/lib/price-catalog-normalize'
import {
	pickNextCalendarColor,
	SECTION_CALENDAR_COLORS,
} from '@/lib/section-calendar-colors'
import type { Place } from '@/lib/places'
import type {
	LocalizedText,
	PriceCatalogStructure,
	PriceSection,
	PriceService,
	PriceZone,
	SexKey,
	ZonePriceItem,
} from '@/types/price-catalog'
import {
	generatePriceItemId,
	getTitleStrictForLocale,
	normalizeItemBookingDayCount,
} from '@/types/price-catalog'
import { Label } from '@/components/ui/label'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useState,
} from 'react'
import { toast } from 'sonner'

const EMPTY_CATALOG: PriceCatalogStructure = {
	man: { services: [] },
	woman: { services: [] },
}

export type AdminPriceCatalogHandle = {
	save: () => Promise<void>
}

interface AdminPriceCatalogProps {
	place: Place
	onSavingChange?: (saving: boolean) => void
}

type SelectedNode =
	| { type: 'sex'; sex: SexKey }
	| { type: 'service'; sex: SexKey; serviceIndex: number }
	| { type: 'section'; sex: SexKey; serviceIndex: number; sectionIndex: number }
	| {
			type: 'zone'
			sex: SexKey
			serviceIndex: number
			sectionIndex: number | null
			zoneIndex: number
	  }
	| {
			type: 'item'
			sex: SexKey
			serviceIndex: number
			sectionIndex: number | null
			zoneIndex: number
			itemIndex: number
	  }
	| {
			type: 'serviceItem'
			sex: SexKey
			serviceIndex: number
			itemIndex: number
	  }
	| null

const AdminPriceCatalog = forwardRef<AdminPriceCatalogHandle, AdminPriceCatalogProps>(
	function AdminPriceCatalog({ place, onSavingChange }, ref) {
	const t = useTranslations('admin')
	const tPrice = useTranslations('price')
	const ui = useMemo(() => getPlaceAccentUi(place), [place])
	const locale = (useLocale() || 'en') as 'sk' | 'en' | 'ru' | 'uk'

	const catalogTreeTitle = useCallback(
		(
			item: LocalizedText & { id?: string },
			kind: 'service' | 'section' | 'zone',
			index: number,
		) => {
			const strict = getTitleStrictForLocale(item, locale)
			if (strict) return strict
			return kind === 'service'
				? t('priceCatalogUnnamedService', { n: index + 1 })
				: kind === 'section'
					? t('priceCatalogUnnamedSection', { n: index + 1 })
					: t('priceCatalogUnnamedZone', { n: index + 1 })
		},
		[locale, t],
	)

	const catalogItemLineTitle = useCallback(
		(item: ZonePriceItem, index: number) => {
			const strict = getTitleStrictForLocale(item, locale)
			if (strict) return strict
			return t('priceCatalogUnnamedLine', { n: index + 1 })
		},
		[locale, t],
	)

	const showSaleInStructure = (item: ZonePriceItem) =>
		Boolean(item.onSale) || isPriceSaleActive(item)
	const [catalog, setCatalog] = useState<PriceCatalogStructure>(EMPTY_CATALOG)
	const [loading, setLoading] = useState(true)

	const load = useCallback(() => {
		setLoading(true)
		fetch(`/api/price-catalog?place=${place}`)
			.then(r => (r.ok ? r.json() : null))
			.then(data => {
				if (data?.man && data?.woman) {
					setCatalog(normalizePriceCatalog(data))
				} else {
					setCatalog(EMPTY_CATALOG)
				}
			})
			.catch(() => setCatalog(EMPTY_CATALOG))
			.finally(() => setLoading(false))
	}, [place])

	useEffect(() => {
		load()
	}, [load])

	const save = useCallback(async () => {
		onSavingChange?.(true)
		try {
			const res = await fetch(`/api/price-catalog?place=${place}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(normalizePriceCatalog(catalog)),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({}))
				throw new Error(err?.error ?? 'Save failed')
			}
			toast.success(t('priceCatalogSaved'))
			load()
		} catch (e) {
			toast.error(t('saveFailed'))
		} finally {
			onSavingChange?.(false)
		}
	}, [catalog, place, t, load, onSavingChange])

	useImperativeHandle(ref, () => ({ save }), [save])

	const updateSex = useCallback((sex: SexKey, services: PriceService[]) => {
		setCatalog(prev => ({
			...prev,
			[sex]: { services },
		}))
	}, [])

	const addService = useCallback(
		(sex: SexKey) => {
			const newService: PriceService = {
				id: generatePriceItemId(),
				titleSk: '',
				titleEn: '',
				titleRu: '',
				titleUk: '',
				calendarColor: pickNextCalendarColor([]),
			}
			updateSex(sex, [...catalog[sex].services, newService])
		},
		[catalog, updateSex],
	)

	const updateService = useCallback(
		(sex: SexKey, index: number, upd: Partial<PriceService>) => {
			const list = [...catalog[sex].services]
			list[index] = { ...list[index], ...upd }
			updateSex(sex, list)
		},
		[catalog, updateSex],
	)

	const removeService = useCallback(
		(sex: SexKey, index: number) => {
			if (!confirm(t('deleteServiceConfirm'))) return
			const list = catalog[sex].services.filter((_, i) => i !== index)
			updateSex(sex, list)
		},
		[catalog, updateSex, t],
	)

	const addSection = useCallback(
		(sex: SexKey, serviceIndex: number) => {
			const svc = catalog[sex].services[serviceIndex]
			const prev = svc.sections ?? []
			const used = prev.map(s => s.calendarColor).filter(Boolean) as string[]
			const sections = [
				...prev,
				{
					id: generatePriceItemId(),
					titleSk: '',
					titleEn: '',
					titleRu: '',
					titleUk: '',
					calendarColor: pickNextCalendarColor(used),
				},
			]
			updateService(sex, serviceIndex, { sections })
		},
		[catalog, updateService],
	)

	const updateSection = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number,
			upd: Partial<PriceSection>,
		) => {
			const svc = catalog[sex].services[serviceIndex]
			const sections = [...(svc.sections ?? [])]
			sections[sectionIndex] = { ...sections[sectionIndex], ...upd }
			updateService(sex, serviceIndex, { sections })
		},
		[catalog, updateService],
	)

	const removeSection = useCallback(
		(sex: SexKey, serviceIndex: number, sectionIndex: number) => {
			if (!confirm(t('deleteServiceConfirm'))) return
			const svc = catalog[sex].services[serviceIndex]
			const sections = (svc.sections ?? []).filter((_, i) => i !== sectionIndex)
			updateService(sex, serviceIndex, { sections })
		},
		[catalog, updateService, t],
	)

	const addZone = useCallback(
		(sex: SexKey, serviceIndex: number, sectionIndex: number | null) => {
			const svc = catalog[sex].services[serviceIndex]
			const zone: PriceZone = {
				id: generatePriceItemId(),
				titleSk: '',
				titleEn: '',
				titleRu: '',
				titleUk: '',
				items: [],
			}
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				const sec = sections[sectionIndex]
				sections[sectionIndex] = { ...sec, zones: [...(sec.zones ?? []), zone] }
				updateService(sex, serviceIndex, { sections })
			} else {
				const rootZones = svc.zones ?? []
				const used = rootZones.map(z => z.calendarColor).filter(Boolean) as string[]
				const z: PriceZone = {
					...zone,
					calendarColor: pickNextCalendarColor(used),
				}
				updateService(sex, serviceIndex, {
					zones: [...rootZones, z],
				})
			}
		},
		[catalog, updateService],
	)

	const updateZone = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number | null,
			zoneIndex: number,
			upd: Partial<PriceZone>,
		) => {
			const svc = catalog[sex].services[serviceIndex]
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				const zones = [...(sections[sectionIndex].zones ?? [])]
				zones[zoneIndex] = { ...zones[zoneIndex], ...upd }
				sections[sectionIndex] = { ...sections[sectionIndex], zones }
				updateService(sex, serviceIndex, { sections })
			} else {
				const zones = [...(svc.zones ?? [])]
				zones[zoneIndex] = { ...zones[zoneIndex], ...upd }
				updateService(sex, serviceIndex, { zones })
			}
		},
		[catalog, updateService],
	)

	const removeZone = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number | null,
			zoneIndex: number,
		) => {
			if (!confirm(t('deleteServiceConfirm'))) return
			const svc = catalog[sex].services[serviceIndex]
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				const zones = (sections[sectionIndex].zones ?? []).filter(
					(_, i) => i !== zoneIndex,
				)
				const sec = { ...sections[sectionIndex], zones }
				// Remove section if it has no zones left
				const newSections =
					zones.length === 0
						? sections.filter((_, i) => i !== sectionIndex)
						: sections.map((s, i) => (i === sectionIndex ? sec : s))
				updateService(sex, serviceIndex, { sections: newSections })
			} else {
				const zones = (svc.zones ?? []).filter((_, i) => i !== zoneIndex)
				updateService(sex, serviceIndex, { zones })
			}
		},
		[catalog, updateService, t],
	)

	const addZoneItem = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number | null,
			zoneIndex: number,
		) => {
			const item: ZonePriceItem = {
				id: generatePriceItemId(),
				titleSk: '',
				titleEn: '',
				titleRu: '',
				titleUk: '',
				durationMinutes: 15,
				price: 0,
			}
			const svc = catalog[sex].services[serviceIndex]
			const getZones = () => {
				if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
					return (svc.sections[sectionIndex].zones ?? []) as PriceZone[]
				}
				return (svc.zones ?? []) as PriceZone[]
			}
			const zones = getZones()
			const zone = zones[zoneIndex]
			const newZones = [...zones]
			newZones[zoneIndex] = { ...zone, items: [...(zone.items ?? []), item] }
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				sections[sectionIndex] = { ...sections[sectionIndex], zones: newZones }
				updateService(sex, serviceIndex, { sections })
			} else {
				updateService(sex, serviceIndex, { zones: newZones })
			}
		},
		[catalog, updateService],
	)

	const updateZoneItem = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number | null,
			zoneIndex: number,
			itemIndex: number,
			upd: Partial<ZonePriceItem>,
		) => {
			const svc = catalog[sex].services[serviceIndex]
			let zones: PriceZone[]
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				zones = [...(svc.sections[sectionIndex].zones ?? [])]
			} else {
				zones = [...(svc.zones ?? [])]
			}
			const zone = zones[zoneIndex]
			const items = [...(zone.items ?? [])]
			items[itemIndex] = { ...items[itemIndex], ...upd }
			zones[zoneIndex] = { ...zone, items }
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				sections[sectionIndex] = { ...sections[sectionIndex], zones }
				updateService(sex, serviceIndex, { sections })
			} else {
				updateService(sex, serviceIndex, { zones })
			}
		},
		[catalog, updateService],
	)

	const removeZoneItem = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			sectionIndex: number | null,
			zoneIndex: number,
			itemIndex: number,
		) => {
			if (!confirm(t('deleteServiceConfirm'))) return
			const svc = catalog[sex].services[serviceIndex]
			const zones =
				sectionIndex !== null && svc.sections?.[sectionIndex]
					? [...(svc.sections[sectionIndex].zones ?? [])]
					: [...(svc.zones ?? [])]
			const zone = zones[zoneIndex]
			const items = (zone.items ?? []).filter((_, i) => i !== itemIndex)
			const newZone = { ...zone, items }
			// Remove zone if it has no items left
			const newZones =
				items.length === 0
					? zones.filter((_, i) => i !== zoneIndex)
					: zones.map((z, i) => (i === zoneIndex ? newZone : z))
			if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
				const sections = [...(svc.sections ?? [])]
				const sec = { ...sections[sectionIndex], zones: newZones }
				const newSections =
					newZones.length === 0
						? sections.filter((_, i) => i !== sectionIndex)
						: sections.map((s, i) => (i === sectionIndex ? sec : s))
				updateService(sex, serviceIndex, { sections: newSections })
			} else {
				updateService(sex, serviceIndex, { zones: newZones })
			}
		},
		[catalog, updateService, t],
	)

	const addServiceItem = useCallback(
		(sex: SexKey, serviceIndex: number) => {
			const item: ZonePriceItem = {
				id: generatePriceItemId(),
				titleSk: '',
				titleEn: '',
				titleRu: '',
				titleUk: '',
				durationMinutes: 15,
				price: 0,
			}
			const svc = catalog[sex].services[serviceIndex]
			const prevItems = svc.items ?? []
			const patch: Partial<PriceService> = { items: [...prevItems, item] }
			if (prevItems.length === 0 && !svc.calendarColor?.trim()) {
				patch.calendarColor = pickNextCalendarColor([])
			}
			updateService(sex, serviceIndex, patch)
		},
		[catalog, updateService],
	)

	const updateServiceItem = useCallback(
		(
			sex: SexKey,
			serviceIndex: number,
			itemIndex: number,
			upd: Partial<ZonePriceItem>,
		) => {
			const svc = catalog[sex].services[serviceIndex]
			const items = [...(svc.items ?? [])]
			items[itemIndex] = { ...items[itemIndex], ...upd }
			updateService(sex, serviceIndex, { items })
		},
		[catalog, updateService],
	)

	const removeServiceItem = useCallback(
		(sex: SexKey, serviceIndex: number, itemIndex: number) => {
			if (!confirm(t('deleteServiceConfirm'))) return
			const svc = catalog[sex].services[serviceIndex]
			const items = (svc.items ?? []).filter((_, i) => i !== itemIndex)
			updateService(sex, serviceIndex, { items })
		},
		[catalog, updateService, t],
	)

	const [selected, setSelected] = useState<SelectedNode>(null)

	if (loading) {
		return <p className='text-icyWhite/60'>{t('loadingSchedule')}</p>
	}

	const renderTitles = (
		item:
			| {
					titleSk?: string
					titleEn?: string
					titleRu?: string
					titleUk?: string
			  }
			| undefined
			| null,
		onChange: (k: string, v: string) => void,
	) => {
		if (!item) return null
		return (
			<div className='grid grid-cols-2 gap-2 text-sm'>
				{(['Sk', 'En', 'Ru', 'Uk'] as const).map(lang => (
					<div key={lang}>
						<label className='text-icyWhite/50 text-xs'>
							{t(`title${lang}` as 'titleSk')}
						</label>
						<input
							type='text'
							value={
								(item[`title${lang}` as keyof typeof item] as string) ?? ''
							}
							onChange={e => onChange(`title${lang}`, e.target.value)}
							className='w-full mt-0.5 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm'
						/>
					</div>
				))}
			</div>
		)
	}

	const MAX_DESCRIPTION_LENGTH = 800

	const renderDescriptions = (
		item:
			| {
					descriptionSk?: string
					descriptionEn?: string
					descriptionRu?: string
					descriptionUk?: string
			  }
			| undefined
			| null,
		onChange: (k: string, v: string) => void,
	) => {
		if (!item) return null
		return (
			<div className='grid grid-cols-2 gap-2 text-sm mt-3'>
				{(['Sk', 'En', 'Ru', 'Uk'] as const).map(lang => {
					const key = `description${lang}` as 'descriptionSk'
					const raw = (item[key] as string) ?? ''
					const value = raw.slice(0, MAX_DESCRIPTION_LENGTH)
					return (
						<div key={lang}>
							<label className='text-icyWhite/50 text-xs'>{t(key)}</label>
							<textarea
								rows={3}
								maxLength={MAX_DESCRIPTION_LENGTH}
								value={value}
								onChange={e => {
									const v = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH)
									onChange(key, v)
								}}
								placeholder={t('priceCatalogDescriptionInputPlaceholder')}
								className='w-full mt-0.5 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm resize-y'
							/>
							<p className='text-[10px] text-icyWhite/40 mt-0.5'>
								{value.length}/{MAX_DESCRIPTION_LENGTH}
							</p>
						</div>
					)
				})}
			</div>
		)
	}

	const MAX_TBD_TEXT = 600

	const renderCalendarColorPicker = (
		currentColor: string | undefined,
		onChange: (color: string) => void,
		hint: string,
	) => (
		<div className='mt-3 space-y-2'>
			<p className='text-xs text-icyWhite/45 flex items-center gap-2'>
				<span
					className={clsx(
						'w-3 h-3 rounded-sm shrink-0',
						currentColor ?? 'bg-gray-500 border-gray-500',
					)}
					aria-hidden
				/>
				{hint}
			</p>
			<div className='flex flex-wrap gap-2'>
				{SECTION_CALENDAR_COLORS.map(color => (
					<button
						key={color}
						type='button'
						onClick={() => onChange(color)}
						className={clsx(
							'w-7 h-7 rounded-md border transition-all',
							color,
							currentColor === color
								? 'ring-2 ring-white/80 ring-offset-2 ring-offset-nearBlack scale-105'
								: 'opacity-80 hover:opacity-100',
						)}
						aria-label={`${t('colorLabel')}: ${color}`}
						title={color}
					/>
				))}
			</div>
		</div>
	)

	const renderScheduleTbdFields = (
		item: ZonePriceItem,
		onPatch: (p: Partial<ZonePriceItem>) => void,
	) => (
		<>
			<p className='text-xs text-icyWhite/50 mt-3'>
				{t('itemScheduleTbdCustomerTitle')}
			</p>
			<div className='grid grid-cols-2 gap-2 text-sm mt-1'>
				{(['Sk', 'En', 'Ru', 'Uk'] as const).map(lang => {
					const key = `scheduleTbdMessage${lang}` as keyof ZonePriceItem
					const raw = String((item[key] as string) ?? '')
					const value = raw.slice(0, MAX_TBD_TEXT)
					return (
						<div key={String(key)}>
							<label className='text-icyWhite/50 text-xs'>
								{t(`title${lang}` as 'titleSk')}
							</label>
							<textarea
								rows={3}
								maxLength={MAX_TBD_TEXT}
								value={value}
								onChange={e =>
									onPatch({
										[key]: e.target.value.slice(0, MAX_TBD_TEXT),
									} as Partial<ZonePriceItem>)
								}
								className='w-full mt-0.5 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm resize-y'
							/>
						</div>
					)
				})}
			</div>
		</>
	)

	const renderTbdDayCountFields = (
		item: ZonePriceItem,
		onPatch: (p: Partial<ZonePriceItem>) => void,
		idSuffix: string,
	) => (
		<div className='flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-2 border-t border-white/10'>
			<Label
				htmlFor={`day-count-${idSuffix}-${item.id}`}
				className='text-xs text-icyWhite/65 shrink-0'
			>
				{t('itemTbdDayCountLabel')}
			</Label>
			<input
				id={`day-count-${idSuffix}-${item.id}`}
				type='number'
				min={1}
				max={14}
				value={normalizeItemBookingDayCount(item.bookingDayCount)}
				onChange={e =>
					onPatch({
						bookingDayCount: normalizeItemBookingDayCount(
							parseInt(e.target.value, 10),
						),
					})
				}
				className='w-16 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm'
			/>
			<p className='text-[11px] text-icyWhite/40 basis-full sm:basis-auto'>
				{t('itemTbdDayCountHint')}
			</p>
		</div>
	)

	const renderBookingGranularityRadios = (
		item: ZonePriceItem,
		onPatch: (p: Partial<ZonePriceItem>) => void,
		idSuffix: string,
	) => {
		const gran = item.bookingGranularity ?? 'time'
		const name = `booking-gran-${idSuffix}-${item.id}`
		return (
			<div className='space-y-2 pt-2 border-t border-white/10 mt-2'>
				<p className='text-xs text-icyWhite/50'>{t('itemBookingModeLabel')}</p>
				<div className='flex flex-col gap-2.5'>
					<label className='flex items-start gap-2.5 cursor-pointer'>
						<input
							type='radio'
							name={name}
							checked={gran === 'time'}
							onChange={() => onPatch({ bookingGranularity: 'time' })}
							className='mt-1 h-4 w-4 shrink-0 accent-white'
						/>
						<span className='text-sm text-icyWhite/75 leading-snug'>
							{t('itemBookingModeTime')}
						</span>
					</label>
					<label className='flex items-start gap-2.5 cursor-pointer'>
						<input
							type='radio'
							name={name}
							checked={gran === 'tbd'}
							onChange={() =>
								onPatch({
									bookingGranularity: 'tbd',
									bookingDayCount: normalizeItemBookingDayCount(
										item.bookingDayCount ?? 1,
									),
								})
							}
							className='mt-1 h-4 w-4 shrink-0 accent-white'
						/>
						<span className='text-sm text-icyWhite/75 leading-snug'>
							{t('itemBookingModeTbd')}
						</span>
					</label>
				</div>
				{gran === 'tbd' && renderTbdDayCountFields(item, onPatch, idSuffix)}
				{gran === 'tbd' && renderScheduleTbdFields(item, onPatch)}
			</div>
		)
	}

	const renderItemPriceRow = (
		item: ZonePriceItem,
		onPatch: (p: Partial<ZonePriceItem>) => void,
		pricePlaceholder: 'short' | 'long',
		onSaleTurnedOn?: () => void,
	) => {
		const ph =
			pricePlaceholder === 'short'
				? t('priceCatalogPriceInputPlaceholderShort')
				: t('priceCatalogPriceInputPlaceholder')
		return (
			<>
				<span className='text-icyWhite/50 text-sm self-center'>{t('priceLabel')}</span>
				<input
					type='text'
					value={typeof item.price === 'number' ? item.price : item.price}
					onChange={e => {
						const v = e.target.value
						const n = parseFloat(v)
						onPatch({
							price: Number.isFinite(n) ? n : v,
						})
					}}
					placeholder={ph}
					aria-label={t('priceLabel')}
					className='w-28 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm'
				/>
				<label className='flex items-center gap-2 cursor-pointer self-center shrink-0'>
					<input
						type='checkbox'
						checked={Boolean(item.onSale)}
						onChange={e => {
							const on = e.target.checked
							if (!on) {
								onPatch({ onSale: false, salePrice: undefined })
								return
							}
							const raw = item.salePrice
							const needsInit =
								raw === undefined ||
								(typeof raw === 'number' && !Number.isFinite(raw)) ||
								(typeof raw === 'string' && String(raw).trim() === '')
							onPatch({
								onSale: true,
								...(needsInit
									? {
											salePrice:
												typeof item.price === 'number' &&
												Number.isFinite(item.price)
													? item.price
													: typeof item.price === 'string'
														? item.price
														: 0,
										}
									: {}),
							})
							onSaleTurnedOn?.()
						}}
						className='h-4 w-4 rounded border-white/20 accent-white shrink-0'
					/>
					<span className='text-xs text-icyWhite/60 whitespace-nowrap'>
						{t('priceCatalogSale')}
					</span>
				</label>
				{item.onSale && (
					<>
						<span className='text-icyWhite/50 text-sm self-center'>
							{t('priceCatalogSalePrice')}
						</span>
						<input
							type='text'
							value={
								item.salePrice === undefined
									? ''
									: typeof item.salePrice === 'number'
										? item.salePrice
										: item.salePrice
							}
							onChange={e => {
								const v = e.target.value
								const n = parseFloat(v)
								onPatch({
									salePrice: Number.isFinite(n) ? n : v,
								})
							}}
							placeholder={t('priceCatalogSalePricePlaceholder')}
							aria-label={t('priceCatalogSalePrice')}
							className='w-28 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-icyWhite text-sm'
						/>
					</>
				)}
			</>
		)
	}

	const renderZoneItem = (
		sex: SexKey,
		serviceIndex: number,
		sectionIndex: number | null,
		zoneIndex: number,
		item: ZonePriceItem | undefined,
		itemIndex: number,
		itemClassName?: string,
	) => {
		if (!item) return null
		return (
			<div
				key={item.id}
				className={clsx(
					'pl-4 border-l border-white/10 py-2 space-y-2',
					itemClassName,
				)}
			>
				{renderTitles(item, (k, v) =>
					updateZoneItem(
						sex,
						serviceIndex,
						sectionIndex,
						zoneIndex,
						itemIndex,
						{
							[k]: v,
						} as Partial<ZonePriceItem>,
					),
				)}
				<div className='flex gap-2 flex-wrap'>
					{(item.bookingGranularity ?? 'time') === 'time' && (
						<>
							<input
								type='number'
								min={5}
								max={240}
								value={item.durationMinutes}
								onChange={e =>
									updateZoneItem(
										sex,
										serviceIndex,
										sectionIndex,
										zoneIndex,
										itemIndex,
										{
											durationMinutes: parseInt(e.target.value, 10) || 15,
										},
									)
								}
								className='w-20 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm'
							/>
							<span className='text-icyWhite/50 text-sm self-center'>
								{t('durationLabel')}
							</span>
						</>
					)}
					{renderItemPriceRow(
						item,
						patch =>
							updateZoneItem(
								sex,
								serviceIndex,
								sectionIndex,
								zoneIndex,
								itemIndex,
								patch,
							),
						'long',
						() =>
							setSelected({
								type: 'item',
								sex,
								serviceIndex,
								sectionIndex,
								zoneIndex,
								itemIndex,
							}),
					)}
					<button
						type='button'
						onClick={() =>
							removeZoneItem(
								sex,
								serviceIndex,
								sectionIndex,
								zoneIndex,
								itemIndex,
							)
						}
						className='text-red-400/80 hover:text-red-400 text-xs'
					>
						{t('delete')}
					</button>
				</div>
				{renderBookingGranularityRadios(item, patch =>
					updateZoneItem(
						sex,
						serviceIndex,
						sectionIndex,
						zoneIndex,
						itemIndex,
						patch,
					),
					'zone',
				)}
			</div>
		)
	}

	const renderZone = (
		sex: SexKey,
		serviceIndex: number,
		sectionIndex: number | null,
		zone: PriceZone | undefined,
		zoneIndex: number,
	) => {
		if (!zone) return null
		return (
			<div
				key={zone.id}
				className='mb-4 rounded-lg border border-white/10 p-3 bg-white/[0.02]'
			>
				<div className='flex justify-between items-start gap-2 mb-2'>
					<div className='flex-1 min-w-0'>
						<span className='text-xs text-icyWhite/50 uppercase'>
							{t('priceCatalogHeadingZone')}
						</span>
						{sectionIndex === null && zone.calendarColor && (
							renderCalendarColorPicker(
								zone.calendarColor,
								color =>
									updateZone(sex, serviceIndex, sectionIndex, zoneIndex, {
										calendarColor: color,
									}),
								t('rootZoneColorInCalendar'),
							)
						)}
						{sectionIndex !== null && (
							<p className='text-xs text-icyWhite/40 mt-1'>
								{t('zoneUsesSectionCalendarColor')}
							</p>
						)}
						{renderTitles(zone, (k, v) =>
							updateZone(sex, serviceIndex, sectionIndex, zoneIndex, {
								[k]: v,
							} as Partial<PriceZone>),
						)}
					</div>
					<div className='flex gap-2 shrink-0'>
						<button
							type='button'
							onClick={() =>
								addZoneItem(sex, serviceIndex, sectionIndex, zoneIndex)
							}
							className={ui.priceCatalogLink}
						>
							{t('priceCatalogAddLineUnderZone')}
						</button>
						<button
							type='button'
							onClick={() =>
								removeZone(sex, serviceIndex, sectionIndex, zoneIndex)
							}
							className='text-red-400/80 hover:text-red-400 text-xs'
						>
							{t('delete')}
						</button>
					</div>
				</div>
				<div className='space-y-1'>
					{(zone.items ?? []).map((item, itemIndex) => {
						if (!item) return null
						const itemRowSelected =
							selected?.type === 'item' &&
							selected.sex === sex &&
							selected.serviceIndex === serviceIndex &&
							selected.sectionIndex === sectionIndex &&
							selected.zoneIndex === zoneIndex &&
							selected.itemIndex === itemIndex
						return renderZoneItem(
							sex,
							serviceIndex,
							sectionIndex,
							zoneIndex,
							item,
							itemIndex,
							itemRowSelected
								? 'ring-1 ring-red-400/45 rounded-md bg-red-500/[0.06]'
								: undefined,
						)
					})}
				</div>
			</div>
		)
	}

	const renderDirectServiceItem = (
		sex: SexKey,
		serviceIndex: number,
		item: ZonePriceItem,
		itemIndex: number,
	) => {
		const itemRowSelected =
			selected?.type === 'serviceItem' &&
			selected.sex === sex &&
			selected.serviceIndex === serviceIndex &&
			selected.itemIndex === itemIndex
		return (
			<div
				key={item.id}
				className={clsx(
					'pl-4 border-l border-white/10 py-2 mt-2 space-y-2',
					itemRowSelected &&
						'ring-1 ring-red-400/45 rounded-md bg-red-500/[0.06]',
				)}
			>
				{renderTitles(item, (k, v) =>
					updateServiceItem(sex, serviceIndex, itemIndex, {
						[k]: v,
					} as Partial<ZonePriceItem>),
				)}
				<div className='flex gap-2 flex-wrap'>
					{(item.bookingGranularity ?? 'time') === 'time' && (
						<>
							<input
								type='number'
								min={5}
								max={240}
								value={item.durationMinutes}
								onChange={e =>
									updateServiceItem(sex, serviceIndex, itemIndex, {
										durationMinutes: parseInt(e.target.value, 10) || 15,
									})
								}
								className='w-20 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm'
							/>
							<span className='text-icyWhite/50 text-sm self-center'>
								{t('durationLabel')}
							</span>
						</>
					)}
					{renderItemPriceRow(
						item,
						patch => updateServiceItem(sex, serviceIndex, itemIndex, patch),
						'short',
						() =>
							setSelected({
								type: 'serviceItem',
								sex,
								serviceIndex,
								itemIndex,
							}),
					)}
					<button
						type='button'
						onClick={() =>
							removeServiceItem(sex, serviceIndex, itemIndex)
						}
						className='text-red-400/80 hover:text-red-400 text-xs'
					>
						{t('delete')}
					</button>
				</div>
				{renderBookingGranularityRadios(item, patch =>
					updateServiceItem(sex, serviceIndex, itemIndex, patch),
					'direct',
				)}
			</div>
		)
	}

	const renderSection = (
		sex: SexKey,
		serviceIndex: number,
		section: PriceSection | undefined,
		sectionIndex: number,
	) => {
		if (!section) return null
		return (
			<div
				key={section.id}
				className='mb-6 rounded-xl border border-white/10 p-4 bg-white/[0.03]'
			>
				<div className='flex justify-between items-start gap-2 mb-3'>
					<div className='flex-1 min-w-0'>
						<span className='text-xs text-icyWhite/50 uppercase'>
							{t('priceCatalogHeadingSection')}
						</span>
						{renderTitles(section, (k, v) =>
							updateSection(sex, serviceIndex, sectionIndex, {
								[k]: v,
							} as Partial<PriceSection>),
						)}
						{renderDescriptions(section, (k, v) =>
							updateSection(sex, serviceIndex, sectionIndex, {
								[k]: v,
							} as Partial<PriceSection>),
						)}
						{renderCalendarColorPicker(
							section.calendarColor,
							color =>
								updateSection(sex, serviceIndex, sectionIndex, {
									calendarColor: color,
								}),
							t('sectionColorInCalendar'),
						)}
					</div>
					<div className='flex gap-2 shrink-0'>
						<button
							type='button'
							onClick={() => addZone(sex, serviceIndex, sectionIndex)}
							className={ui.priceCatalogLink}
						>
							{t('priceCatalogBtnAddZone')}
						</button>
						<button
							type='button'
							onClick={() => removeSection(sex, serviceIndex, sectionIndex)}
							className='text-red-400/80 hover:text-red-400 text-xs'
						>
							{t('delete')}
						</button>
					</div>
				</div>
				<div className='space-y-2'>
					{(section.zones ?? []).map((zone, zoneIndex) =>
						zone
							? renderZone(sex, serviceIndex, sectionIndex, zone, zoneIndex)
							: null,
					)}
				</div>
			</div>
		)
	}

	const renderService = (
		sex: SexKey,
		service: PriceService | undefined,
		serviceIndex: number,
	) => {
		if (!service) return null
		return (
			<div key={service.id} className={ui.priceCatalogCard}>
				<div className='flex justify-between items-start gap-2 mb-4'>
					<div className='flex-1 min-w-0'>
						<span className='text-xs text-icyWhite/50 uppercase'>
							{t('priceCatalogHeadingService')}
						</span>
						{renderTitles(service, (k, v) =>
							updateService(sex, serviceIndex, { [k]: v }),
						)}
					</div>
					<div className='flex gap-2 shrink-0'>
						<button
							type='button'
							onClick={() => addSection(sex, serviceIndex)}
							className={ui.priceCatalogLink}
						>
							{t('priceCatalogBtnAddSection')}
						</button>
						<button
							type='button'
							onClick={() => addZone(sex, serviceIndex, null)}
							className={ui.priceCatalogLink}
						>
							{t('priceCatalogBtnAddZone')}
						</button>
						<button
							type='button'
							onClick={() => addServiceItem(sex, serviceIndex)}
							className={ui.priceCatalogLink}
						>
							{t('priceCatalogBtnAddItem')}
						</button>
						<button
							type='button'
							onClick={() => removeService(sex, serviceIndex)}
							className='text-red-400/80 hover:text-red-400 text-xs'
						>
							{t('delete')}
						</button>
					</div>
				</div>
				<div className='space-y-4'>
					{(service.sections ?? []).map((section, sectionIndex) =>
						section
							? renderSection(sex, serviceIndex, section, sectionIndex)
							: null,
					)}
					{(service.zones ?? []).map((zone, zoneIndex) =>
						zone ? renderZone(sex, serviceIndex, null, zone, zoneIndex) : null,
					)}
					{(service.items ?? []).length > 0 && (
						<div className='rounded-lg border border-white/10 p-3 bg-white/[0.02]'>
							<span className='text-xs text-icyWhite/50 uppercase'>
								{t('priceCatalogHeadingDirectItems')}
							</span>
							{renderCalendarColorPicker(
								service.calendarColor,
								color => updateService(sex, serviceIndex, { calendarColor: color }),
								t('directItemsColorInCalendar'),
							)}
							{(service.items ?? []).map((item, itemIndex) =>
								renderDirectServiceItem(sex, serviceIndex, item, itemIndex),
							)}
						</div>
					)}
				</div>
			</div>
		)
	}

	const isSelected = (node: SelectedNode) =>
		selected && JSON.stringify(selected) === JSON.stringify(node)

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap gap-4'>
				<div>
					<h1 className='font-serif text-2xl text-icyWhite'>
						{t('priceCatalog')}
					</h1>
					<p className='text-icyWhite/60 text-sm mt-0.5'>
						{t('priceCatalogSubtitle')}
					</p>
					<p className='text-icyWhite/45 text-xs mt-2 max-w-xl'>
						{t('priceCatalogCalendarSyncHint')}
					</p>
					<p className='text-icyWhite/40 text-xs mt-1.5 max-w-xl'>
						{t('priceCatalogPriceEmptyHint')}
					</p>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[480px]'>
				{/* Left: structure tree */}
				<div className='rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col'>
					<div className='px-4 py-3 border-b border-white/10'>
						<h2 className='font-medium text-icyWhite text-sm'>
							{t('structure')}
						</h2>
					</div>
					<div className='flex-1 overflow-y-auto p-3 space-y-2'>
						{(['woman', 'man'] as const).map(sex => (
							<div key={sex}>
								<button
									type='button'
									onClick={() => setSelected({ type: 'sex', sex })}
									className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
										isSelected({ type: 'sex', sex })
											? ui.priceCatalogPill
											: 'hover:bg-white/5 text-icyWhite'
									}`}
								>
									{tPrice(sex)}
								</button>
								<div className='ml-3 mt-1 space-y-0.5'>
									{catalog[sex].services.map((svc, si) => (
										<div key={svc.id}>
											<button
												type='button'
												onClick={() =>
													setSelected({
														type: 'service',
														sex,
														serviceIndex: si,
													})
												}
												className={`w-full text-left px-3 py-1.5 rounded text-sm truncate ${
													isSelected({ type: 'service', sex, serviceIndex: si })
														? ui.priceCatalogPillMuted
														: 'hover:bg-white/5 text-icyWhite/90'
												}`}
											>
												{catalogTreeTitle(svc, 'service', si)}
											</button>
											{(svc.items ?? []).map((item, itemIndex) =>
												showSaleInStructure(item) ? (
													<div key={`sale-line-${item.id}`} className='ml-3 mt-0.5'>
														<button
															type='button'
															onClick={() =>
																setSelected({
																	type: 'serviceItem',
																	sex,
																	serviceIndex: si,
																	itemIndex,
																})
															}
															className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-2 min-w-0 ${
																isSelected({
																	type: 'serviceItem',
																	sex,
																	serviceIndex: si,
																	itemIndex,
																})
																	? ui.priceCatalogPillMuted
																	: 'hover:bg-white/5 text-icyWhite/90'
															}`}
														>
															<span className='shrink-0 text-[9px] font-bold uppercase tracking-wide text-red-400'>
																{t('priceCatalogSaleActionLabel')}
															</span>
															<span className='truncate'>
																{catalogItemLineTitle(item, itemIndex)}
															</span>
														</button>
													</div>
												) : null,
											)}
											{(svc.sections ?? []).map((sec, sei) =>
												!sec ? null : (
													<div key={sec.id} className='ml-3'>
														<button
															type='button'
															onClick={() =>
																setSelected({
																	type: 'section',
																	sex,
																	serviceIndex: si,
																	sectionIndex: sei,
																})
															}
															className={`w-full text-left px-2 py-1 rounded text-xs truncate flex items-center gap-2 min-w-0 ${
																isSelected({
																	type: 'section',
																	sex,
																	serviceIndex: si,
																	sectionIndex: sei,
																})
																	? ui.priceCatalogPillMuted
																	: 'hover:bg-white/5 text-icyWhite/70'
															}`}
														>
															{sec.calendarColor ? (
																<span
																	className={clsx(
																		'w-2 h-2 rounded-sm shrink-0',
																		sec.calendarColor,
																	)}
																	aria-hidden
																/>
															) : null}
															<span className='truncate'>
																{catalogTreeTitle(sec, 'section', sei)}
															</span>
														</button>
														{(sec.zones ?? []).map((z, zi) =>
															!z ? null : (
																<div key={z.id} className='ml-3'>
																	<button
																		type='button'
																		onClick={() =>
																			setSelected({
																				type: 'zone',
																				sex,
																				serviceIndex: si,
																				sectionIndex: sei,
																				zoneIndex: zi,
																			})
																		}
																		className={`w-full text-left px-2 py-0.5 rounded text-xs truncate ${
																			isSelected({
																				type: 'zone',
																				sex,
																				serviceIndex: si,
																				sectionIndex: sei,
																				zoneIndex: zi,
																			})
																				? ui.priceCatalogPillMuted
																				: 'hover:bg-white/5 text-icyWhite/60'
																		}`}
																	>
																		{catalogTreeTitle(z, 'zone', zi)}
																	</button>
																	{(z.items ?? []).map((it, ii) =>
																		showSaleInStructure(it) ? (
																			<div
																				key={`sale-line-${it.id}`}
																				className='ml-3 mt-0.5'
																			>
																				<button
																					type='button'
																					onClick={() =>
																						setSelected({
																							type: 'item',
																							sex,
																							serviceIndex: si,
																							sectionIndex: sei,
																							zoneIndex: zi,
																							itemIndex: ii,
																						})
																					}
																					className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-2 min-w-0 ${
																						isSelected({
																							type: 'item',
																							sex,
																							serviceIndex: si,
																							sectionIndex: sei,
																							zoneIndex: zi,
																							itemIndex: ii,
																						})
																							? ui.priceCatalogPillMuted
																							: 'hover:bg-white/5 text-icyWhite/90'
																					}`}
																				>
																					<span className='shrink-0 text-[9px] font-bold uppercase tracking-wide text-red-400'>
																						{t('priceCatalogSaleActionLabel')}
																					</span>
																					<span className='truncate'>
																						{catalogItemLineTitle(it, ii)}
																					</span>
																				</button>
																			</div>
																		) : null,
																	)}
																</div>
															),
														)}
													</div>
												),
											)}
											{(svc.zones ?? []).map((z, zi) =>
												!z ? null : (
													<div key={z.id} className='ml-3'>
														<button
															type='button'
															onClick={() =>
																setSelected({
																	type: 'zone',
																	sex,
																	serviceIndex: si,
																	sectionIndex: null,
																	zoneIndex: zi,
																})
															}
															className={`w-full text-left px-2 py-0.5 rounded text-xs truncate flex items-center gap-2 min-w-0 ${
																isSelected({
																	type: 'zone',
																	sex,
																	serviceIndex: si,
																	sectionIndex: null,
																	zoneIndex: zi,
																})
																	? ui.priceCatalogPillMuted
																	: 'hover:bg-white/5 text-icyWhite/60'
															}`}
														>
															{z.calendarColor ? (
																<span
																	className={clsx(
																		'w-2 h-2 rounded-sm shrink-0',
																		z.calendarColor,
																	)}
																	aria-hidden
																/>
															) : null}
															<span className='truncate'>
																{catalogTreeTitle(z, 'zone', zi)}
															</span>
														</button>
														{(z.items ?? []).map((it, ii) =>
															showSaleInStructure(it) ? (
																<div
																	key={`sale-line-${it.id}`}
																	className='ml-3 mt-0.5'
																>
																	<button
																		type='button'
																		onClick={() =>
																			setSelected({
																				type: 'item',
																				sex,
																				serviceIndex: si,
																				sectionIndex: null,
																				zoneIndex: zi,
																				itemIndex: ii,
																			})
																		}
																		className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-2 min-w-0 ${
																			isSelected({
																				type: 'item',
																				sex,
																				serviceIndex: si,
																				sectionIndex: null,
																				zoneIndex: zi,
																				itemIndex: ii,
																			})
																				? ui.priceCatalogPillMuted
																				: 'hover:bg-white/5 text-icyWhite/90'
																		}`}
																	>
																		<span className='shrink-0 text-[9px] font-bold uppercase tracking-wide text-red-400'>
																			{t('priceCatalogSaleActionLabel')}
																		</span>
																		<span className='truncate'>
																			{catalogItemLineTitle(it, ii)}
																		</span>
																	</button>
																</div>
															) : null,
														)}
													</div>
												),
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right: edit panel */}
				<div className='rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col'>
					<div className='px-4 py-3 border-b border-white/10'>
						<h2 className='font-medium text-icyWhite text-sm'>
							{t('editPanel')}
						</h2>
					</div>
					<div className='flex-1 overflow-y-auto p-4'>
						{selected?.type === 'sex' && (
							<div className='space-y-3'>
								<p className='text-icyWhite/60 text-sm'>
									{tPrice(selected.sex)}
								</p>
								<button
									type='button'
									onClick={() => addService(selected.sex)}
									className={ui.priceCatalogLinkSm}
								>
									+ {t('addService')}
								</button>
							</div>
						)}
						{selected?.type === 'service' && (
							<div>
								{renderService(
									selected.sex,
									catalog[selected.sex].services[selected.serviceIndex],
									selected.serviceIndex,
								)}
							</div>
						)}
						{selected?.type === 'section' && (
							<div>
								{renderSection(
									selected.sex,
									selected.serviceIndex,
									catalog[selected.sex].services[selected.serviceIndex]
										.sections![selected.sectionIndex],
									selected.sectionIndex,
								)}
							</div>
						)}
						{selected?.type === 'zone' && (
							<div>
								{renderZone(
									selected.sex,
									selected.serviceIndex,
									selected.sectionIndex,
									selected.sectionIndex !== null
										? catalog[selected.sex].services[selected.serviceIndex]
												.sections![selected.sectionIndex].zones![
												selected.zoneIndex
											]
										: catalog[selected.sex].services[selected.serviceIndex]
												.zones![selected.zoneIndex],
									selected.zoneIndex,
								)}
							</div>
						)}
						{selected?.type === 'item' && (() => {
							const sel = selected
							const svc = catalog[sel.sex].services[sel.serviceIndex]
							const zone =
								sel.sectionIndex !== null
									? svc.sections?.[sel.sectionIndex]?.zones?.[sel.zoneIndex]
									: svc.zones?.[sel.zoneIndex]
							const item = zone?.items?.[sel.itemIndex]
							if (!item) {
								return (
									<p className='text-icyWhite/50 text-sm'>
										{t('priceCatalogMissingLine')}
									</p>
								)
							}
							const parts: string[] = [
								catalogTreeTitle(svc, 'service', sel.serviceIndex),
							]
							if (sel.sectionIndex !== null) {
								const sec = svc.sections?.[sel.sectionIndex]
								if (sec) {
									parts.push(
										catalogTreeTitle(sec, 'section', sel.sectionIndex),
									)
								}
							}
							if (zone) {
								parts.push(catalogTreeTitle(zone, 'zone', sel.zoneIndex))
							}
							parts.push(catalogItemLineTitle(item, sel.itemIndex))
							return (
								<div className='space-y-3'>
									<div className='rounded-lg border border-red-400/25 bg-red-500/[0.06] px-3 py-2.5'>
										<p className='text-[10px] font-semibold uppercase tracking-wide text-red-300/90'>
											{t('priceCatalogSaleActionLabel')}
										</p>
										<p className='text-xs text-icyWhite/75 mt-1 break-words'>
											{parts.join(' · ')}
										</p>
										<button
											type='button'
											onClick={() =>
												setSelected({
													type: 'zone',
													sex: sel.sex,
													serviceIndex: sel.serviceIndex,
													sectionIndex: sel.sectionIndex,
													zoneIndex: sel.zoneIndex,
												})
											}
											className='text-[11px] mt-2 text-icyWhite/50 hover:text-icyWhite/80 underline-offset-2 hover:underline'
										>
											{t('priceCatalogBackToZone')}
										</button>
									</div>
									{renderZoneItem(
										sel.sex,
										sel.serviceIndex,
										sel.sectionIndex,
										sel.zoneIndex,
										item,
										sel.itemIndex,
									)}
								</div>
							)
						})()}
						{selected?.type === 'serviceItem' && (() => {
							const sel = selected
							const svc = catalog[sel.sex].services[sel.serviceIndex]
							const item = svc.items?.[sel.itemIndex]
							if (!item) {
								return (
									<p className='text-icyWhite/50 text-sm'>
										{t('priceCatalogMissingLine')}
									</p>
								)
							}
							const parts = [
								catalogTreeTitle(svc, 'service', sel.serviceIndex),
								catalogItemLineTitle(item, sel.itemIndex),
							]
							return (
								<div className='space-y-3'>
									<div className='rounded-lg border border-red-400/25 bg-red-500/[0.06] px-3 py-2.5'>
										<p className='text-[10px] font-semibold uppercase tracking-wide text-red-300/90'>
											{t('priceCatalogSaleActionLabel')}
										</p>
										<p className='text-xs text-icyWhite/75 mt-1 break-words'>
											{parts.join(' · ')}
										</p>
										<button
											type='button'
											onClick={() =>
												setSelected({
													type: 'service',
													sex: sel.sex,
													serviceIndex: sel.serviceIndex,
												})
											}
											className='text-[11px] mt-2 text-icyWhite/50 hover:text-icyWhite/80 underline-offset-2 hover:underline'
										>
											{t('priceCatalogBackToService')}
										</button>
									</div>
									{renderDirectServiceItem(
										sel.sex,
										sel.serviceIndex,
										item,
										sel.itemIndex,
									)}
								</div>
							)
						})()}
						{!selected && (
							<p className='text-icyWhite/50 text-sm'>
								{t('selectNodeToEdit')}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	)
})

AdminPriceCatalog.displayName = 'AdminPriceCatalog'

export default AdminPriceCatalog
