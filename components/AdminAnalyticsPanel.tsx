'use client'

/**
 * Admin analytics panel — KPIs (bookings, customers, new/returning %, revenue,
 * average check), service mix, daily trend, and the underlying booking list.
 *
 * Period scope: bookings whose start time falls inside [from, to). `from` is
 * inclusive, `to` is exclusive — that way "this month" and "next month" don't
 * overlap. TBD bookings (no concrete date) are excluded from period stats.
 *
 * Revenue: resolved from the place's price catalog using `serviceId` first,
 * then falls back to the leaf title. Items priced as a string ("from 20") are
 * parsed for their leading number; items with no parseable price are counted
 * as bookings but excluded from revenue averages. The split is shown so the
 * admin understands when "Avg check" is based on partial data.
 *
 * Returning %: a customer in the period is "returning" when the `clients` doc
 * shows their `firstSeenAt` is before the period start; otherwise "new". Both
 * counts add up to the unique-customers KPI.
 */

import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { formatBratislavaDate } from '@/lib/format-date'
import type { ClientDoc } from '@/lib/clients-firestore'
import type { AppointmentData } from '@/lib/book-appointment'
import type { ServiceData } from '@/lib/services'
import type { Place } from '@/lib/places'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import {
	appointmentPrice,
	appointmentServiceLabel,
	bookingBehaviorBreakdown,
	bookingStatusTotals,
	cancellationRate,
	confirmationRate,
	flattenCatalogPrices,
	formatMoney,
	formatPercent,
	normalizeShortLocale,
	resolvePeriod,
	responseRate,
	tsToDate,
	type BookingBehaviorRow,
	type PeriodKey,
} from '@/lib/analytics-helpers'
import { clsx } from 'clsx'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import {
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	BarChart2,
	CheckCircle2,
	Circle,
	Clock,
	FileDown,
	Search,
	Sparkles,
	UserCheck,
	UserPlus,
	Users,
	Wallet,
	XCircle,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState, type ElementType } from 'react'

interface AdminAnalyticsPanelProps {
	place: Place
	placeLabel: string
	allAppointments: AppointmentData[]
	services: ServiceData[]
	calendarColorServices: ServiceData[]
}

export default function AdminAnalyticsPanel({
	place,
	placeLabel,
	allAppointments,
	services,
	calendarColorServices,
}: AdminAnalyticsPanelProps) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const locale = useLocale()
	const shortLocale = useMemo(() => normalizeShortLocale(locale), [locale])

	const [periodKey, setPeriodKey] = useState<PeriodKey>('thisMonth')
	const todayStr = useMemo(() => {
		const d = new Date()
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
	}, [])
	const firstOfMonthStr = useMemo(() => {
		const d = new Date()
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
	}, [])
	const [customFrom, setCustomFrom] = useState(firstOfMonthStr)
	const [customTo, setCustomTo] = useState(todayStr)
	const [search, setSearch] = useState('')

	const [catalog, setCatalog] = useState<PriceCatalogStructure | null>(null)
	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				const res = await fetch(`/api/price-catalog?place=${place}`, {
					cache: 'no-store',
				})
				if (!res.ok) throw new Error('PRICE_CATALOG_FETCH_FAILED')
				const data = (await res.json()) as PriceCatalogStructure
				if (!cancelled) setCatalog(data)
			} catch {
				if (!cancelled) setCatalog(null)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [place])

	const [clientsByPhone, setClientsByPhone] = useState<Map<string, ClientDoc>>(
		() => new Map(),
	)
	useEffect(() => {
		const q = query(collection(db, 'clients'))
		const unsub = onSnapshot(q, snap => {
			const map = new Map<string, ClientDoc>()
			for (const docSnap of snap.docs) {
				const data = docSnap.data() as ClientDoc
				if (data?.phone) map.set(data.phone, data)
			}
			setClientsByPhone(map)
		})
		return () => unsub()
	}, [])

	const { from, to } = useMemo(
		() => resolvePeriod(periodKey, { from: customFrom, to: customTo }),
		[periodKey, customFrom, customTo],
	)

	const { byId: priceById, byTitle: priceByTitle } = useMemo(
		() => flattenCatalogPrices(catalog),
		[catalog],
	)

	/** Period bookings: real start in [from, to), excluding TBD placeholder. */
	const periodAppointments = useMemo(() => {
		return allAppointments.filter(apt => {
			if (apt.scheduleTbd) return false
			const start = tsToDate(apt.startTime)
			if (!start) return false
			return start.getTime() >= from.getTime() && start.getTime() < to.getTime()
		})
	}, [allAppointments, from, to])

	/**
	 * Per-appointment revenue (null when no price match).
	 *
	 * Cancelled bookings are excluded — even though the catalog price is
	 * known, the salon didn't earn it. The customer "still in period" stats
	 * keep cancelled bookings (a cancelled booking is still a customer
	 * interaction); only money-shaped metrics treat them as zero.
	 */
	const appointmentRevenue = useMemo(() => {
		const map = new Map<string, number | null>()
		for (const apt of periodAppointments) {
			if (apt.bookingStatus === 'cancelled') {
				map.set(apt.id, null)
				continue
			}
			map.set(
				apt.id,
				appointmentPrice(apt, calendarColorServices, priceById, priceByTitle),
			)
		}
		return map
	}, [periodAppointments, calendarColorServices, priceById, priceByTitle])

	/**
	 * Customer-behavior aggregates for the period:
	 *
	 *   - `totals`              raw counts per current status
	 *   - `cancellationRate`    cancelled / total
	 *   - `confirmationRate`    confirmed / total (current state only)
	 *   - `responseRate`        (confirmed + cancelled) / total — fraction
	 *                           of customers who engaged with the reminder
	 *   - `breakdown`           ordered rows for the bar-chart panel
	 *
	 * All metrics share the same `periodAppointments` cohort so percentages
	 * stay consistent across the panel.
	 */
	const behaviorStats = useMemo(
		() => ({
			totals: bookingStatusTotals(periodAppointments),
			cancellationRate: cancellationRate(periodAppointments),
			confirmationRate: confirmationRate(periodAppointments),
			responseRate: responseRate(periodAppointments),
			breakdown: bookingBehaviorBreakdown(periodAppointments),
		}),
		[periodAppointments],
	)

	const kpis = useMemo(() => {
		const totalBookings = periodAppointments.length
		const phones = new Set<string>()
		const phoneBookingCount = new Map<string, number>()
		let revenueSum = 0
		let revenueCount = 0
		for (const apt of periodAppointments) {
			if (apt.phone) {
				phones.add(apt.phone)
				phoneBookingCount.set(
					apt.phone,
					(phoneBookingCount.get(apt.phone) ?? 0) + 1,
				)
			}
			const rev = appointmentRevenue.get(apt.id) ?? null
			if (rev != null) {
				revenueSum += rev
				revenueCount += 1
			}
		}

		let returning = 0
		let firstTime = 0
		phones.forEach(phone => {
			const client = clientsByPhone.get(phone)
			const firstSeen = client ? tsToDate(client.firstSeenAt) : null
			if (firstSeen && firstSeen.getTime() < from.getTime()) returning += 1
			else firstTime += 1
		})

		const repeatInPeriod = Array.from(phoneBookingCount.values()).filter(
			n => n >= 2,
		).length

		const uniqueCustomers = phones.size
		const avgPerBooking = revenueCount > 0 ? revenueSum / revenueCount : null
		const avgPerCustomer =
			uniqueCustomers > 0 && revenueCount > 0 ? revenueSum / uniqueCustomers : null
		const avgBookingsPerCustomer =
			uniqueCustomers > 0 ? totalBookings / uniqueCustomers : 0

		return {
			totalBookings,
			uniqueCustomers,
			returning,
			firstTime,
			returningRate: uniqueCustomers > 0 ? returning / uniqueCustomers : 0,
			firstTimeRate: uniqueCustomers > 0 ? firstTime / uniqueCustomers : 0,
			repeatInPeriod,
			repeatRate: uniqueCustomers > 0 ? repeatInPeriod / uniqueCustomers : 0,
			revenueSum: revenueCount > 0 ? revenueSum : null,
			revenueCount,
			revenueCoverage:
				totalBookings > 0 ? revenueCount / totalBookings : 0,
			avgPerBooking,
			avgPerCustomer,
			avgBookingsPerCustomer,
		}
	}, [periodAppointments, appointmentRevenue, clientsByPhone, from])

	const serviceBreakdown = useMemo(() => {
		type Row = {
			key: string
			label: string
			count: number
			revenue: number | null
			revenueCount: number
		}
		const rows = new Map<string, Row>()
		for (const apt of periodAppointments) {
			const key = apt.serviceId || apt.service || '—'
			const label = appointmentServiceLabel(apt, shortLocale, priceById, priceByTitle)
			const rev = appointmentRevenue.get(apt.id) ?? null
			const cur = rows.get(key) ?? {
				key,
				label,
				count: 0,
				revenue: 0,
				revenueCount: 0,
			}
			cur.count += 1
			if (rev != null) {
				cur.revenue = (cur.revenue ?? 0) + rev
				cur.revenueCount += 1
			}
			rows.set(key, cur)
		}
		const arr = Array.from(rows.values())
		arr.sort((a, b) => b.count - a.count)
		const max = arr[0]?.count ?? 0
		return { rows: arr.slice(0, 8), max }
	}, [periodAppointments, appointmentRevenue, shortLocale, priceById, priceByTitle])

	const dailyTrend = useMemo(() => {
		const map = new Map<string, number>()
		const cursor = new Date(from)
		while (cursor.getTime() < to.getTime()) {
			const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
			map.set(key, 0)
			cursor.setDate(cursor.getDate() + 1)
		}
		for (const apt of periodAppointments) {
			const start = tsToDate(apt.startTime)
			if (!start) continue
			const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
			map.set(key, (map.get(key) ?? 0) + 1)
		}
		const buckets = Array.from(map.entries()).map(([key, count]) => ({
			key,
			count,
		}))
		const max = Math.max(1, ...buckets.map(b => b.count))
		// If the period is long, downsample to ~30 bars by week-summing.
		if (buckets.length > 31) {
			const groupSize = Math.ceil(buckets.length / 30)
			const grouped: { key: string; count: number }[] = []
			for (let i = 0; i < buckets.length; i += groupSize) {
				const slice = buckets.slice(i, i + groupSize)
				grouped.push({
					key: slice[0]!.key,
					count: slice.reduce((acc, b) => acc + b.count, 0),
				})
			}
			return { buckets: grouped, max: Math.max(1, ...grouped.map(b => b.count)) }
		}
		return { buckets, max }
	}, [periodAppointments, from, to])

	const filteredList = useMemo(() => {
		const q = search.trim().toLocaleLowerCase()
		if (!q) return periodAppointments
		return periodAppointments.filter(apt => {
			const localizedLabel = appointmentServiceLabel(
				apt,
				shortLocale,
				priceById,
				priceByTitle,
			)
			const hay = [
				apt.fullName,
				apt.email,
				apt.phone,
				apt.service,
				apt.serviceSk,
				apt.serviceEn,
				apt.serviceRu,
				apt.serviceUk,
				localizedLabel,
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase()
			return hay.includes(q)
		})
	}, [periodAppointments, search, shortLocale, priceById, priceByTitle])

	const periodLabel = useMemo(() => {
		const fromLabel = formatBratislavaDate(from)
		const toLabel = formatBratislavaDate(new Date(to.getTime() - 1))
		return `${fromLabel} – ${toLabel}`
	}, [from, to])

	const exportPdf = () => {
		const doc = new jsPDF({ orientation: 'landscape' })
		doc.setFontSize(14)
		doc.text(`${t('analytics')} — ${placeLabel}`, 14, 15)
		doc.setFontSize(10)
		doc.text(periodLabel, 14, 22)
		const summaryRows: string[][] = [
			[t('analyticsKpiBookings'), String(kpis.totalBookings)],
			[t('analyticsKpiCustomers'), String(kpis.uniqueCustomers)],
			[
				t('analyticsKpiReturning'),
				`${kpis.returning} (${formatPercent(kpis.returningRate)})`,
			],
			[
				t('analyticsKpiNew'),
				`${kpis.firstTime} (${formatPercent(kpis.firstTimeRate)})`,
			],
			[t('analyticsKpiRevenue'), formatMoney(kpis.revenueSum, locale)],
			[t('analyticsKpiAvgPerBooking'), formatMoney(kpis.avgPerBooking, locale)],
			[t('analyticsKpiAvgPerCustomer'), formatMoney(kpis.avgPerCustomer, locale)],
		]
		autoTable(doc, {
			head: [[t('analyticsExportSummary'), '']],
			body: summaryRows,
			startY: 28,
			theme: 'grid',
			headStyles: { fillColor: [232, 184, 0] },
		})
		const startY = (doc as unknown as { lastAutoTable?: { finalY: number } })
			.lastAutoTable
			? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
			: 50
		autoTable(doc, {
			head: [
				[
					tCommon('date'),
					tCommon('time'),
					tCommon('services'),
					t('customer'),
					t('phoneHeader'),
					t('analyticsExportPrice'),
				],
			],
			body: filteredList.map(apt => {
				const start = tsToDate(apt.startTime)
				const end = tsToDate(apt.endTime)
				const rev = appointmentRevenue.get(apt.id) ?? null
				return [
					start ? formatBratislavaDate(start) : '—',
					start && end
						? `${start.toLocaleTimeString(locale, {
								hour: '2-digit',
								minute: '2-digit',
							})}–${end.toLocaleTimeString(locale, {
								hour: '2-digit',
								minute: '2-digit',
							})}`
						: '—',
					appointmentServiceLabel(apt, shortLocale, priceById, priceByTitle),
					apt.fullName || '—',
					apt.phone || '—',
					rev != null ? formatMoney(rev, locale) : '—',
				]
			}),
			startY,
			theme: 'grid',
			headStyles: { fillColor: [232, 184, 0] },
		})
		doc.save(
			`analytics-${place}-${from.toISOString().slice(0, 10)}-${new Date(to.getTime() - 1).toISOString().slice(0, 10)}.pdf`,
		)
	}

	return (
		<div className='space-y-6 animate-in fade-in-0 duration-200'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
				<div>
					<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
						{t('analytics')}
					</h1>
					<p className='mt-0.5 text-sm text-icyWhite/60'>
						{t('analyticsSubtitleV2')}
					</p>
					<p className='mt-1 text-xs text-icyWhite/45 tabular-nums'>
						{periodLabel}
					</p>
				</div>
				<button
					type='button'
					onClick={exportPdf}
					className='inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-gold-soft/45 bg-gold-soft/15 px-4 py-2.5 text-sm font-medium text-gold-glow hover:bg-gold-soft/25 transition-colors'
				>
					<FileDown className='h-4 w-4' aria-hidden />
					{t('exportPdf')}
				</button>
			</div>

			{/* Period selector */}
			<div className='space-y-3'>
				<div className='flex flex-wrap gap-2'>
					{(
						[
							['thisMonth', t('analyticsPeriodThisMonth')],
							['lastMonth', t('analyticsPeriodLastMonth')],
							['last30', t('analyticsPeriodLast30')],
							['last90', t('analyticsPeriodLast90')],
							['thisYear', t('analyticsPeriodThisYear')],
							['custom', t('analyticsPeriodCustom')],
						] as [PeriodKey, string][]
					).map(([key, label]) => (
						<button
							key={key}
							type='button'
							onClick={() => setPeriodKey(key)}
							className={clsx(
								'rounded-full px-3 py-1.5 text-xs font-medium transition-colors border',
								periodKey === key
									? 'bg-gold-soft/25 text-gold-glow border-gold-soft/45'
									: 'bg-white/[0.04] text-icyWhite/70 border-white/10 hover:bg-white/[0.08]',
							)}
						>
							{label}
						</button>
					))}
				</div>
				{periodKey === 'custom' && (
					<div className='flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3'>
						<div className='space-y-1'>
							<label className='text-[11px] font-semibold uppercase tracking-wider text-icyWhite/55'>
								{t('analyticsCustomFrom')}
							</label>
							<Input
								type='date'
								value={customFrom}
								onChange={e => setCustomFrom(e.target.value)}
								onClick={e => {
									const i = e.currentTarget as HTMLInputElement & {
										showPicker?: () => void
									}
									try {
										i.showPicker?.()
									} catch {
										/* unsupported */
									}
								}}
								className='cursor-pointer rounded-lg'
							/>
						</div>
						<div className='space-y-1'>
							<label className='text-[11px] font-semibold uppercase tracking-wider text-icyWhite/55'>
								{t('analyticsCustomTo')}
							</label>
							<Input
								type='date'
								value={customTo}
								onChange={e => setCustomTo(e.target.value)}
								onClick={e => {
									const i = e.currentTarget as HTMLInputElement & {
										showPicker?: () => void
									}
									try {
										i.showPicker?.()
									} catch {
										/* unsupported */
									}
								}}
								className='cursor-pointer rounded-lg'
							/>
						</div>
					</div>
				)}
			</div>

			{/* KPI tiles */}
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
				<KpiTile
					icon={BarChart2}
					label={t('analyticsKpiBookings')}
					value={String(kpis.totalBookings)}
					secondary={
						behaviorStats.totals.cancelled > 0
							? t('analyticsKpiCancellationRate', {
									pct: formatPercent(behaviorStats.cancellationRate),
								})
							: undefined
					}
				/>
				<KpiTile
					icon={CheckCircle2}
					label={t('analyticsKpiConfirmed')}
					value={`${behaviorStats.totals.confirmed} · ${formatPercent(behaviorStats.confirmationRate)}`}
					tone={behaviorStats.totals.confirmed > 0 ? 'emerald' : undefined}
				/>
				<KpiTile
					icon={ArrowDownRight}
					label={t('analyticsKpiCancelled')}
					value={`${behaviorStats.totals.cancelled} · ${formatPercent(behaviorStats.cancellationRate)}`}
					tone={behaviorStats.totals.cancelled > 0 ? 'rose' : undefined}
				/>
				<KpiTile
					icon={Users}
					label={t('analyticsKpiCustomers')}
					value={String(kpis.uniqueCustomers)}
					secondary={t('analyticsKpiAvgBookingsPerCustomer', {
						value: kpis.avgBookingsPerCustomer.toFixed(1),
					})}
				/>
				<KpiTile
					icon={UserCheck}
					label={t('analyticsKpiReturning')}
					value={`${kpis.returning} · ${formatPercent(kpis.returningRate)}`}
					tone='emerald'
					secondary={t('analyticsKpiRepeatInPeriod', {
						count: kpis.repeatInPeriod,
						pct: formatPercent(kpis.repeatRate),
					})}
				/>
				<KpiTile
					icon={UserPlus}
					label={t('analyticsKpiNew')}
					value={`${kpis.firstTime} · ${formatPercent(kpis.firstTimeRate)}`}
					tone='gold'
				/>
				<KpiTile
					icon={Wallet}
					label={t('analyticsKpiRevenue')}
					value={formatMoney(kpis.revenueSum, locale)}
					secondary={
						kpis.totalBookings > 0
							? t('analyticsKpiRevenueCoverage', {
									count: kpis.revenueCount,
									total: kpis.totalBookings,
								})
							: undefined
					}
				/>
				<KpiTile
					icon={Sparkles}
					label={t('analyticsKpiAvgPerBooking')}
					value={formatMoney(kpis.avgPerBooking, locale)}
				/>
				<KpiTile
					icon={Sparkles}
					label={t('analyticsKpiAvgPerCustomer')}
					value={formatMoney(kpis.avgPerCustomer, locale)}
				/>
				<KpiTile
					icon={kpis.returningRate >= 0.5 ? ArrowUpRight : ArrowDownRight}
					label={t('analyticsKpiReturningRate')}
					value={formatPercent(kpis.returningRate)}
					tone={kpis.returningRate >= 0.5 ? 'emerald' : 'amber'}
				/>
			</div>

			{/* Customer behavior breakdown */}
			<div className='rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
				<div className='mb-3 flex flex-wrap items-baseline justify-between gap-2'>
					<h3 className='text-sm font-semibold uppercase tracking-wider text-icyWhite/65'>
						{t('analyticsBehaviorTitle')}
					</h3>
					<p className='text-xs text-icyWhite/55'>
						{t('analyticsBehaviorResponseRate', {
							pct: formatPercent(behaviorStats.responseRate),
						})}
					</p>
				</div>
				{behaviorStats.totals.total === 0 ? (
					<p className='text-sm text-icyWhite/50'>{t('analyticsNoData')}</p>
				) : (
					<ul className='space-y-2.5'>
						{behaviorStats.breakdown.rows.map(row => {
							const widthPct = Math.max(2, Math.round(row.share * 100))
							const isEmpty = row.count === 0
							const styling = behaviorRowStyling(row.status)
							const StatusIcon = styling.icon
							return (
								<li key={row.status} className='space-y-1'>
									<div className='flex items-center justify-between gap-3 text-xs'>
										<span className='inline-flex items-center gap-1.5 text-icyWhite/85'>
											<StatusIcon
												className={`h-3.5 w-3.5 ${styling.iconClass}`}
												strokeWidth={2.25}
												aria-hidden
											/>
											{t(`analyticsBehaviorStatus_${row.status}`)}
										</span>
										<span
											className={`shrink-0 tabular-nums ${
												isEmpty ? 'text-icyWhite/35' : 'text-icyWhite/80'
											}`}
										>
											{row.count}
											<span className='ml-1.5 text-icyWhite/45'>
												· {formatPercent(row.share)}
											</span>
										</span>
									</div>
									<div className='h-1.5 overflow-hidden rounded-full bg-white/[0.04]'>
										<div
											className={`h-full rounded-full transition-[width] ${styling.barClass}`}
											style={{
												width: isEmpty ? '0%' : `${widthPct}%`,
											}}
											aria-hidden
										/>
									</div>
								</li>
							)
						})}
					</ul>
				)}
				<p className='mt-3 text-[11px] text-icyWhite/50'>
					{t('analyticsBehaviorFooter', {
						total: behaviorStats.totals.total,
					})}
				</p>
			</div>

			{/* Service mix + daily trend */}
			<div className='grid grid-cols-1 gap-4 lg:grid-cols-5'>
				<div className='lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
					<h3 className='mb-3 text-sm font-semibold uppercase tracking-wider text-icyWhite/65'>
						{t('analyticsServiceMix')}
					</h3>
					{serviceBreakdown.rows.length === 0 ? (
						<p className='text-sm text-icyWhite/50'>{t('analyticsNoData')}</p>
					) : (
						<ul className='space-y-2.5'>
							{serviceBreakdown.rows.map(row => {
								const widthPct = Math.max(
									4,
									Math.round((row.count / Math.max(1, serviceBreakdown.max)) * 100),
								)
								return (
									<li key={row.key} className='space-y-1'>
										<div className='flex items-center justify-between gap-3 text-xs text-icyWhite/80'>
											<span className='min-w-0 truncate'>{row.label}</span>
											<span className='shrink-0 tabular-nums text-icyWhite/70'>
												{row.count}
												{row.revenue != null && row.revenueCount > 0 && (
													<span className='ml-1.5 text-icyWhite/45'>
														· {formatMoney(row.revenue, locale)}
													</span>
												)}
											</span>
										</div>
										<div className='h-2 overflow-hidden rounded-full bg-white/[0.05]'>
											<div
												className='h-full bg-gold-soft/50'
												style={{ width: `${widthPct}%` }}
											/>
										</div>
									</li>
								)
							})}
						</ul>
					)}
				</div>

				<div className='lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
					<h3 className='mb-3 text-sm font-semibold uppercase tracking-wider text-icyWhite/65'>
						{t('analyticsDailyTrend')}
					</h3>
					{dailyTrend.buckets.length === 0 ? (
						<p className='text-sm text-icyWhite/50'>{t('analyticsNoData')}</p>
					) : (
						<div
							className='flex items-end gap-0.5 overflow-x-auto pb-1'
							style={{ minHeight: '7rem' }}
						>
							{dailyTrend.buckets.map(b => {
								const h = Math.max(2, Math.round((b.count / dailyTrend.max) * 100))
								return (
									<div
										key={b.key}
										className='group flex flex-1 flex-col items-center gap-1'
										style={{ minWidth: '10px' }}
										title={`${b.key}: ${b.count}`}
									>
										<div
											className={clsx(
												'w-full rounded-sm transition-colors',
												b.count > 0
													? 'bg-gold-soft/55 group-hover:bg-gold-glow/80'
													: 'bg-white/5',
											)}
											style={{ height: `${h}%` }}
										/>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* Detail table */}
			<div className='space-y-3'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<h3 className='text-sm font-semibold uppercase tracking-wider text-icyWhite/65'>
						{t('analyticsBookingList')}
					</h3>
					<div className='relative w-full sm:max-w-md'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icyWhite/45' />
						<Input
							type='search'
							variant='search'
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder={t('searchByNameOrPhone')}
							className='rounded-lg text-sm py-2.5'
						/>
					</div>
				</div>
				<div className='rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden'>
					{filteredList.length === 0 ? (
						<div className='p-12 text-center text-icyWhite/50'>
							{search.trim() ? t('noSearchResults') : t('analyticsNoBookings')}
						</div>
					) : (
						<>
							<div className='space-y-3 p-4 sm:hidden'>
								{filteredList.map(apt => {
									const start = tsToDate(apt.startTime)
									const end = tsToDate(apt.endTime)
									const duration =
										start && end
											? Math.round((end.getTime() - start.getTime()) / 60000)
											: 0
									const rev = appointmentRevenue.get(apt.id) ?? null
									return (
										<div
											key={apt.id}
											className='rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-icyWhite space-y-1.5'
										>
											<div className='flex items-center justify-between gap-2'>
												<span className='font-medium tabular-nums'>
													{start ? formatBratislavaDate(start) : '—'}
												</span>
												<span className='text-xs text-icyWhite/60 tabular-nums'>
													{rev != null ? formatMoney(rev, locale) : `${duration}m`}
												</span>
											</div>
											<div className='text-icyWhite/85 truncate'>
												{appointmentServiceLabel(apt, shortLocale, priceById, priceByTitle)}
											</div>
											<div className='text-xs text-icyWhite/70'>
												{apt.fullName || '—'}
											</div>
											<div className='text-[11px] text-icyWhite/55 flex flex-col gap-0.5'>
												{apt.phone && <span>{apt.phone}</span>}
												{apt.email && <span>{apt.email}</span>}
											</div>
										</div>
									)
								})}
							</div>
							<div className='hidden sm:block'>
								<div className='overflow-x-auto'>
									<table className='w-full text-left'>
										<thead>
											<tr className='border-b border-white/10 bg-white/[0.04]'>
												<Th>{tCommon('date')}</Th>
												<Th>{tCommon('time')}</Th>
												<Th>{tCommon('services')}</Th>
												<Th>{t('customer')}</Th>
												<Th className='hidden md:table-cell'>{t('phoneHeader')}</Th>
												<Th className='text-right'>{t('analyticsExportPrice')}</Th>
											</tr>
										</thead>
										<tbody>
											{filteredList.map(apt => {
												const start = tsToDate(apt.startTime)
												const end = tsToDate(apt.endTime)
												const rev = appointmentRevenue.get(apt.id) ?? null
												return (
													<tr
														key={apt.id}
														className='border-b border-white/5 hover:bg-white/[0.04] transition-colors'
													>
														<td className='px-4 py-3 text-sm text-icyWhite tabular-nums'>
															{start ? formatBratislavaDate(start) : '—'}
														</td>
														<td className='px-4 py-3 text-sm text-icyWhite tabular-nums'>
															{start && end
																? `${start.toLocaleTimeString(locale, {
																		hour: '2-digit',
																		minute: '2-digit',
																	})}–${end.toLocaleTimeString(locale, {
																		hour: '2-digit',
																		minute: '2-digit',
																	})}`
																: '—'}
														</td>
														<td className='px-4 py-3 text-sm text-icyWhite truncate max-w-[280px]'>
															{appointmentServiceLabel(apt, shortLocale, priceById, priceByTitle)}
														</td>
														<td className='px-4 py-3 text-sm text-icyWhite'>
															{apt.fullName || '—'}
														</td>
														<td className='px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell tabular-nums'>
															{apt.phone || '—'}
														</td>
														<td className='px-4 py-3 text-sm text-icyWhite/90 text-right tabular-nums'>
															{rev != null ? formatMoney(rev, locale) : '—'}
														</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

/**
 * Per-status visual styling for the customer-behavior breakdown bars.
 * Matches the rail/badge palette used on calendar blocks
 * (`lib/booking-status-ui.ts`) so the same status reads the same color
 * everywhere in the admin.
 */
function behaviorRowStyling(status: BookingBehaviorRow['status']): {
	icon: ElementType
	iconClass: string
	barClass: string
} {
	switch (status) {
		case 'confirmed':
			return {
				icon: CheckCircle2,
				iconClass: 'text-emerald-300',
				barClass: 'bg-emerald-500/70',
			}
		case 'cancelled':
			return {
				icon: XCircle,
				iconClass: 'text-rose-300',
				barClass: 'bg-rose-500/70',
			}
		case 'completed':
			return {
				icon: Circle,
				iconClass: 'text-sky-300',
				barClass: 'bg-sky-500/70',
			}
		case 'no_show':
			return {
				icon: AlertTriangle,
				iconClass: 'text-amber-300',
				barClass: 'bg-amber-500/70',
			}
		case 'pending':
		default:
			return {
				icon: Clock,
				iconClass: 'text-icyWhite/55',
				barClass: 'bg-white/30',
			}
	}
}

function Th({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<th
			className={clsx(
				'px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider',
				className,
			)}
		>
			{children}
		</th>
	)
}

function KpiTile({
	icon: Icon,
	label,
	value,
	secondary,
	tone,
}: {
	icon: ElementType
	label: string
	value: string
	secondary?: string
	tone?: 'gold' | 'emerald' | 'amber' | 'rose'
}) {
	const toneRingClass =
		tone === 'emerald'
			? 'border-emerald-500/30'
			: tone === 'amber'
				? 'border-amber-500/30'
				: tone === 'gold'
					? 'border-gold-soft/35'
					: tone === 'rose'
						? 'border-rose-500/30'
						: 'border-white/10'
	const toneIconColor =
		tone === 'emerald'
			? 'text-emerald-300'
			: tone === 'amber'
				? 'text-amber-200'
				: tone === 'gold'
					? 'text-gold-glow'
					: tone === 'rose'
						? 'text-rose-300'
						: 'text-icyWhite/70'
	return (
		<div
			className={clsx(
				'rounded-2xl border bg-white/[0.03] px-4 py-3.5',
				toneRingClass,
			)}
		>
			<div className='flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-icyWhite/55'>
				<span className='truncate'>{label}</span>
				<Icon className={clsx('h-4 w-4 shrink-0', toneIconColor)} aria-hidden />
			</div>
			<div className='mt-1.5 font-serif text-2xl text-icyWhite tabular-nums'>
				{value}
			</div>
			{secondary && (
				<div className='mt-0.5 text-[11px] text-icyWhite/50'>{secondary}</div>
			)}
		</div>
	)
}
