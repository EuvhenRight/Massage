'use client'

import BookingPageLayout from '@/components/BookingPageLayout'
import BookingFlow from '@/components/booking-flow'
import BookingPageSkeleton from '@/components/booking-flow/BookingPageSkeleton'
import type { ServiceData } from '@/lib/services'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export default function BookingPage() {
	const locale = useLocale()
	const t = useTranslations('booking')
	const [services, setServices] = useState<ServiceData[]>([])
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		setLoaded(false)
		fetch(`/api/services?place=massage&locale=${locale}`)
			.then(r => r.ok && r.json())
			.then(data => (Array.isArray(data) ? setServices(data) : []))
			.catch(() => [])
			.finally(() => setLoaded(true))
	}, [locale])

	const serviceOptions = services.map(s => ({
		title: s.title,
		durationMinutes: s.durationMinutes,
		bookingGranularity:
			s.bookingGranularity === 'day'
				? ('day' as const)
				: s.bookingGranularity === 'tbd'
					? ('tbd' as const)
					: ('time' as const),
		bookingDayCount: s.bookingDayCount,
		scheduleTbdMessage: s.scheduleTbdMessage,
		scheduleTbdAdminNote: s.scheduleTbdAdminNote,
	}))

	return (
		<BookingPageLayout maxWidth='7xl'>
			{!loaded ? (
				<BookingPageSkeleton />
			) : (
				<BookingFlow
					services={
						serviceOptions.length > 0
							? serviceOptions
							: [
							{
									title: t('appointmentFallback'),
									durationMinutes: 60,
									bookingGranularity: 'time' as const,
								},
								]
					}
					defaultDuration={60}
					place='massage'
				/>
			)}
		</BookingPageLayout>
	)
}
