'use client'

import BookingPageLayout from '@/components/BookingPageLayout'
import BookingFlow from '@/components/booking-flow'
import BookingPageSkeleton from '@/components/booking-flow/BookingPageSkeleton'
import { flattenPriceCatalogToServices } from '@/lib/price-catalog-utils'
import type { ServiceData } from '@/lib/services'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function DepilationBookingPage() {
	const locale = useLocale() as 'sk' | 'en' | 'ru' | 'uk'
	const t = useTranslations('booking')
	const searchParams = useSearchParams()
	const [services, setServices] = useState<ServiceData[]>([])
	const [priceCatalog, setPriceCatalog] =
		useState<PriceCatalogStructure | null>(null)
	const [catalogLoaded, setCatalogLoaded] = useState(false)

	const presetService = searchParams.get('service')
	const presetDuration = searchParams.get('duration')

	useEffect(() => {
		fetch(`/api/services?place=depilation&locale=${locale}`)
			.then(r => r.ok && r.json())
			.then(data => (Array.isArray(data) ? setServices(data) : []))
			.catch(() => {})
	}, [locale])

	const loadPriceCatalog = useCallback(() => {
		setCatalogLoaded(false)
		fetch(`/api/price-catalog?place=depilation`, { cache: 'no-store' })
			.then(r => (r.ok ? r.json() : null))
			.then(data => (data?.man && data?.woman ? data : null))
			.then(data => {
				setPriceCatalog(data)
				setCatalogLoaded(true)
			})
			.catch(() => {
				setPriceCatalog(null)
				setCatalogLoaded(true)
			})
	}, [])

	useEffect(() => {
		loadPriceCatalog()
	}, [loadPriceCatalog])

	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === 'visible') loadPriceCatalog()
		}
		document.addEventListener('visibilitychange', onVisible)
		return () => document.removeEventListener('visibilitychange', onVisible)
	}, [loadPriceCatalog])

	const serviceOptions = useMemo(() => {
		const hasCatalog =
			priceCatalog &&
			(priceCatalog.man.services.length > 0 ||
				priceCatalog.woman.services.length > 0)

		if (hasCatalog) {
			const flat = flattenPriceCatalogToServices(priceCatalog!, locale)
			return flat.map(s => ({
				id: undefined,
				title: s.title,
				durationMinutes: s.durationMinutes,
				bookingGranularity: s.bookingGranularity,
				bookingDayCount: s.bookingDayCount,
				scheduleTbdMessage: s.scheduleTbdMessage,
				scheduleTbdAdminNote: s.scheduleTbdAdminNote,
				titleSk: s.title,
				titleEn: s.title,
				titleRu: s.title,
				titleUk: s.title,
			}))
		}

		const fromApi = services.map(s => ({
			id: s.id,
			title: s.title,
			durationMinutes: s.durationMinutes,
			bookingGranularity:
				s.bookingGranularity === 'day' || s.bookingGranularity === 'tbd'
					? ('tbd' as const)
					: ('time' as const),
			bookingDayCount: s.bookingDayCount,
			scheduleTbdMessage: s.scheduleTbdMessage,
			scheduleTbdAdminNote: s.scheduleTbdAdminNote,
			titleSk: s.titleSk,
			titleEn: s.titleEn,
			titleRu: s.titleRu,
			titleUk: s.titleUk,
		}))
		if (presetService && presetDuration) {
			const duration = Math.max(
				15,
				Math.min(240, parseInt(presetDuration, 10) || 60),
			)
			const exists = fromApi.some(s => s.title === presetService)
			if (!exists) {
				return [
					{
						id: undefined,
						title: presetService,
						durationMinutes: duration,
						bookingGranularity: 'time' as const,
						titleSk: presetService,
						titleEn: presetService,
						titleRu: presetService,
						titleUk: presetService,
					},
					...fromApi,
				]
			}
		}
		return fromApi
	}, [services, priceCatalog, locale, presetService, presetDuration])

	const defaultService = presetService?.trim() || undefined
	const defaultDuration = presetDuration
		? Math.max(15, Math.min(240, parseInt(presetDuration, 10) || 60))
		: 60

	const list =
		serviceOptions.length > 0
			? serviceOptions
			: [
					{
						title: t('appointmentFallback'),
						durationMinutes: 60,
						bookingGranularity: 'time' as const,
					},
				]

	return (
		<BookingPageLayout maxWidth='7xl'>
			{!catalogLoaded ? (
				<BookingPageSkeleton />
			) : (
				<BookingFlow
					services={list}
					defaultDuration={defaultDuration}
					defaultService={defaultService}
					priceCatalog={priceCatalog}
					place='depilation'
				/>
			)}
		</BookingPageLayout>
	)
}
