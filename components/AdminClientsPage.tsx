'use client'

import AdminClientCardModal from '@/components/AdminClientCardModal'
import AdminHeader from '@/components/AdminHeader'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { formatBratislavaDate } from '@/lib/format-date'
import type { ClientDoc } from '@/lib/clients-firestore'
import type { Place } from '@/lib/places'
import { clsx } from 'clsx'
import {
	collection,
	onSnapshot,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type FilterKey = 'all' | 'birthdaySoon' | 'dormant' | 'noOptIn'

const DAY_MS = 24 * 60 * 60 * 1000
const DORMANT_THRESHOLD_DAYS = 180
const BIRTHDAY_SOON_DAYS = 7

function tsToDate(value: unknown): Date | null {
	if (!value) return null
	if (value instanceof Timestamp) return value.toDate()
	if (typeof value === 'object' && value && 'toDate' in value) {
		return (value as { toDate: () => Date }).toDate()
	}
	return null
}

/** Days until next birthday (0 = today, 7 = within a week). Returns null if no birthday. */
function daysUntilBirthday(
	birthday: ClientDoc['birthday'],
	now: Date,
): number | null {
	if (!birthday) return null
	const year = now.getFullYear()
	let next = new Date(year, birthday.month - 1, birthday.day)
	const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	if (next.getTime() < todayMid.getTime()) {
		next = new Date(year + 1, birthday.month - 1, birthday.day)
	}
	return Math.round((next.getTime() - todayMid.getTime()) / DAY_MS)
}

interface AdminClientsPageProps {
	place: Place
}

export default function AdminClientsPage({ place }: AdminClientsPageProps) {
	const params = useParams()
	const locale = (params?.locale as string) ?? 'ru'
	const t = useTranslations('admin')

	const [clients, setClients] = useState<ClientDoc[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [filter, setFilter] = useState<FilterKey>('all')
	const [selected, setSelected] = useState<ClientDoc | null>(null)
	const [createOpen, setCreateOpen] = useState(false)

	useEffect(() => {
		// Per-place scoping: clients show up under the studio of their last
		// visit. A single phone number is still one client doc (canonical
		// identity), but the list view filters by `lastVisitPlace` so the
		// two admin panels stay independent. Manually-created clients pass
		// `place` to `createClientByAdmin` so they land in the right bucket
		// from day one.
		const q = query(
			collection(db, 'clients'),
			where('lastVisitPlace', '==', place),
		)
		const unsub = onSnapshot(q, snap => {
			const list = snap.docs.map(d => d.data() as ClientDoc)
			list.sort((a, b) => {
				const ta = tsToDate(a.lastVisitAt)?.getTime() ?? 0
				const tb = tsToDate(b.lastVisitAt)?.getTime() ?? 0
				return tb - ta
			})
			setClients(list)
		})
		return () => unsub()
	}, [place])

	// Stable "now" reference: computed once when the page mounts. The clients
	// list refreshes via onSnapshot; minor clock drift while the page is open
	// is fine for the birthday-soon filter (uses day granularity).
	const now = useMemo(() => new Date(), [])

	const filtered = useMemo(() => {
		const q = searchQuery.trim().toLowerCase()
		return clients.filter(c => {
			if (q) {
				const hay = [
					c.firstName,
					c.lastName ?? '',
					c.phone,
					c.email ?? '',
				]
					.join(' ')
					.toLowerCase()
				if (!hay.includes(q)) return false
			}
			if (filter === 'birthdaySoon') {
				const d = daysUntilBirthday(c.birthday, now)
				if (d === null || d > BIRTHDAY_SOON_DAYS) return false
			} else if (filter === 'dormant') {
				const last = tsToDate(c.lastVisitAt)
				if (!last) return false
				const days = (now.getTime() - last.getTime()) / DAY_MS
				if (days < DORMANT_THRESHOLD_DAYS) return false
			} else if (filter === 'noOptIn') {
				if (c.optInMarketing) return false
			}
			return true
		})
	}, [clients, searchQuery, filter, now])

	const filterChips: { key: FilterKey; label: string }[] = [
		{ key: 'all', label: t('clientsFilterAll') },
		{ key: 'birthdaySoon', label: t('clientsFilterBirthdaySoon') },
		{ key: 'dormant', label: t('clientsFilterDormant') },
		{ key: 'noOptIn', label: t('clientsFilterNoOptIn') },
	]

	return (
		<main className='flex min-h-screen flex-col bg-nearBlack pb-[env(safe-area-inset-bottom,0px)] text-icyWhite'>
			<AdminHeader
				locale={locale}
				place={place}
				section='clients'
			/>

			{/*
			 * Width mirrors `lib/place-accent-ui.ts > adminMainContent` so this
			 * page sits in the same horizontal rhythm as Calendar / Agenda /
			 * Analytics / Price. No `max-w` — admin pages run edge-to-edge.
			 */}
			<div className='relative z-10 w-full min-w-0 px-4 py-8 sm:px-8 sm:py-10 lg:px-12'>
				<div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
					<div>
						<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
							{t('clientsTitle')}
						</h1>
						<p className='mt-0.5 max-w-2xl text-sm text-icyWhite/60'>
							{t('clientsSubtitle')}
						</p>
					</div>
					<button
						type='button'
						onClick={() => setCreateOpen(true)}
						className='inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-gold-soft/45 bg-gold-soft/15 px-4 py-2.5 text-sm font-medium text-gold-glow hover:bg-gold-soft/25 transition-colors'
					>
						<Plus className='h-4 w-4' aria-hidden />
						{t('clientsNewClient')}
					</button>
				</div>

				<div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='relative w-full sm:max-w-md'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icyWhite/45' />
						<Input
							type='search'
							variant='search'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder={t('clientsSearchPlaceholder')}
							className='rounded-lg text-sm py-2.5'
						/>
					</div>
					<div className='flex flex-wrap gap-2'>
						{filterChips.map(chip => (
							<button
								key={chip.key}
								type='button'
								onClick={() => setFilter(chip.key)}
								className={clsx(
									'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
									filter === chip.key
										? 'bg-gold-soft/25 text-gold-glow border border-gold-soft/45'
										: 'bg-white/[0.04] text-icyWhite/70 border border-white/10 hover:bg-white/[0.08]',
								)}
							>
								{chip.label}
							</button>
						))}
					</div>
				</div>

				<div className='glass-card overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]'>
					{clients.length === 0 ? (
						<div className='p-12 text-center text-icyWhite/50'>
							{t('clientsEmpty')}
						</div>
					) : filtered.length === 0 ? (
						<div className='p-12 text-center text-icyWhite/50'>
							{t('clientsNoMatches')}
						</div>
					) : (
						<>
							<div className='space-y-3 p-4 sm:hidden'>
								{filtered.map(c => (
									<ClientCardMobile
										key={c.phone}
										client={c}
										now={now}
										onOpen={() => setSelected(c)}
									/>
								))}
							</div>
							<div className='hidden sm:block'>
								<div className='overflow-x-auto'>
									<table className='w-full text-left'>
										<thead>
											<tr className='border-b border-white/10 bg-white/[0.04]'>
												<Th>{t('clientsColumnName')}</Th>
												<Th>{t('clientsColumnPhone')}</Th>
												<Th className='hidden md:table-cell'>
													{t('clientsColumnEmail')}
												</Th>
												<Th>{t('clientsColumnLastVisit')}</Th>
												<Th className='hidden lg:table-cell'>
													{t('clientsColumnBirthday')}
												</Th>
												<Th className='hidden lg:table-cell'>
													{t('clientsColumnVisits')}
												</Th>
												<Th>{t('clientsColumnStatus')}</Th>
											</tr>
										</thead>
										<tbody>
											{filtered.map(c => (
												<ClientRow
													key={c.phone}
													client={c}
													now={now}
													onOpen={() => setSelected(c)}
												/>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			{selected && (
				<AdminClientCardModal
					mode='edit'
					client={selected}
					place={place}
					onClose={() => setSelected(null)}
				/>
			)}
			{createOpen && (
				<AdminClientCardModal
					mode='create'
					client={null}
					place={place}
					onClose={() => setCreateOpen(false)}
				/>
			)}
		</main>
	)
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

function StatusBadges({ client, now }: { client: ClientDoc; now: Date }) {
	const t = useTranslations('admin')
	const badges: { label: string; tone: 'gold' | 'red' | 'gray' }[] = []

	const daysToBd = daysUntilBirthday(client.birthday, now)
	if (daysToBd === 0) {
		badges.push({ label: t('clientsBadgeBirthdayToday'), tone: 'gold' })
	} else if (daysToBd !== null && daysToBd <= BIRTHDAY_SOON_DAYS) {
		badges.push({
			label: t('clientsBadgeBirthdayDays', { days: daysToBd }),
			tone: 'gold',
		})
	}

	const lastVisit = tsToDate(client.lastVisitAt)
	if (lastVisit) {
		const dormantDays = Math.floor(
			(now.getTime() - lastVisit.getTime()) / DAY_MS,
		)
		if (dormantDays >= DORMANT_THRESHOLD_DAYS) {
			badges.push({
				label: t('clientsBadgeDormantDays', { days: dormantDays }),
				tone: 'red',
			})
		}
	}

	if (!client.optInMarketing) {
		badges.push({ label: t('clientsBadgeMarketingOff'), tone: 'gray' })
	}
	if (client.optInWhatsApp === false) {
		badges.push({ label: t('clientsBadgeWhatsappOff'), tone: 'gray' })
	}

	if (badges.length === 0) return null
	return (
		<div className='flex flex-wrap gap-1'>
			{badges.map(b => (
				<span
					key={b.label}
					className={clsx(
						'rounded-full px-2 py-0.5 text-[11px] font-medium border',
						b.tone === 'gold' &&
							'border-gold-soft/45 bg-gold-soft/15 text-gold-glow',
						b.tone === 'red' &&
							'border-red-500/35 bg-red-500/10 text-red-200',
						b.tone === 'gray' &&
							'border-white/15 bg-white/[0.04] text-icyWhite/60',
					)}
				>
					{b.label}
				</span>
			))}
		</div>
	)
}

function ClientRow({
	client,
	now,
	onOpen,
}: {
	client: ClientDoc
	now: Date
	onOpen: () => void
}) {
	const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ') || '—'
	const lastVisit = tsToDate(client.lastVisitAt)
	return (
		<tr
			role='button'
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onOpen()
				}
			}}
			className='border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer'
		>
			<td className='px-4 py-3 text-sm text-icyWhite'>{fullName}</td>
			<td className='px-4 py-3 text-sm text-icyWhite/85'>{client.phone}</td>
			<td className='px-4 py-3 text-sm text-icyWhite/75 hidden md:table-cell'>
				{client.email || '—'}
			</td>
			<td className='px-4 py-3 text-sm text-icyWhite/85'>
				{lastVisit ? formatBratislavaDate(lastVisit) : '—'}
			</td>
			<td className='px-4 py-3 text-sm text-icyWhite/75 hidden lg:table-cell'>
				{client.birthday
					? `${String(client.birthday.day).padStart(2, '0')}.${String(
							client.birthday.month,
						).padStart(2, '0')}.${client.birthday.year}`
					: '—'}
			</td>
			<td className='px-4 py-3 text-sm text-icyWhite/85 hidden lg:table-cell tabular-nums'>
				{client.visitCount ?? 0}
			</td>
			<td className='px-4 py-3'>
				<StatusBadges client={client} now={now} />
			</td>
		</tr>
	)
}

function ClientCardMobile({
	client,
	now,
	onOpen,
}: {
	client: ClientDoc
	now: Date
	onOpen: () => void
}) {
	const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ') || '—'
	const lastVisit = tsToDate(client.lastVisitAt)
	return (
		<div
			role='button'
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onOpen()
				}
			}}
			className='rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-icyWhite space-y-1.5 cursor-pointer transition-colors hover:bg-white/[0.07] active:scale-[0.99]'
		>
			<div className='flex items-center justify-between gap-2'>
				<span className='font-medium'>{fullName}</span>
				<span className='text-xs text-icyWhite/60 tabular-nums'>
					{lastVisit ? formatBratislavaDate(lastVisit) : '—'}
				</span>
			</div>
			<div className='text-xs text-icyWhite/70'>{client.phone}</div>
			{client.email && (
				<div className='text-[11px] text-icyWhite/55'>{client.email}</div>
			)}
			<StatusBadges client={client} now={now} />
		</div>
	)
}
