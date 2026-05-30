'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/firebase'
import { formatBratislavaDate } from '@/lib/format-date'
import {
	type ClientDoc,
	createClientByAdmin,
	updateClient,
	type ClientAdminPatch,
} from '@/lib/clients-firestore'
import { parseWhatsappE164 } from '@/lib/phone-e164'
import type { Place } from '@/lib/places'
import type { AppointmentData } from '@/lib/book-appointment'
import { inferAdminBookingModeFromFirestore } from '@/lib/book-appointment'
import { clsx } from 'clsx'
import {
	collection,
	onSnapshot,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { Cake, Gift, RotateCcw, Save, Send, Tag, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

export type AdminClientCardModalMode = 'edit' | 'create'

interface AdminClientCardModalProps {
	mode: AdminClientCardModalMode
	client: ClientDoc | null
	/** Current studio context — used as `lastVisitPlace` for manually-created clients. */
	place: Place
	onClose: () => void
	onCreated?: (phoneE164: string) => void
}

function ts(value: unknown): Date | null {
	if (!value) return null
	if (value instanceof Timestamp) return value.toDate()
	if (typeof value === 'object' && value && 'toDate' in value) {
		return (value as { toDate: () => Date }).toDate()
	}
	return null
}

function birthdayToInput(birthday: ClientDoc['birthday']): string {
	if (!birthday) return ''
	const m = String(birthday.month).padStart(2, '0')
	const d = String(birthday.day).padStart(2, '0')
	return `${birthday.year}-${m}-${d}`
}

function inputToBirthday(value: string): ClientDoc['birthday'] {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
	const [y, m, d] = value.split('-').map(Number)
	if (!y || !m || !d) return null
	if (m < 1 || m > 12 || d < 1 || d > 31) return null
	return { year: y, month: m, day: d }
}

type BookingStatus = 'upcoming' | 'completed' | 'tbd'

function bookingStatus(apt: AppointmentData, now: Date): BookingStatus {
	if (apt.scheduleTbd) return 'tbd'
	const start = ts(apt.startTime)
	if (!start) return 'tbd'
	return start.getTime() >= now.getTime() ? 'upcoming' : 'completed'
}

export default function AdminClientCardModal({
	mode,
	client,
	place,
	onClose,
	onCreated,
}: AdminClientCardModalProps) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const isCreate = mode === 'create'

	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [phone, setPhone] = useState('')
	const [email, setEmail] = useState('')
	const [birthdayInput, setBirthdayInput] = useState('')
	const [notes, setNotes] = useState('')
	const [adminNotes, setAdminNotes] = useState('')
	const [tags, setTags] = useState<string[]>([])
	const [tagDraft, setTagDraft] = useState('')
	const [optInWhatsApp, setOptInWhatsApp] = useState(true)
	const [optInMarketing, setOptInMarketing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [sendingBirthday, setSendingBirthday] = useState(false)
	const [sendingReEng, setSendingReEng] = useState(false)
	const [sendBanner, setSendBanner] = useState<
		| { kind: 'success'; text: string }
		| { kind: 'error'; text: string }
		| null
	>(null)

	const seedFromClient = (c: ClientDoc | null) => {
		setFirstName(c?.firstName ?? '')
		setLastName(c?.lastName ?? '')
		setPhone(c?.phone ?? '')
		setEmail(c?.email ?? '')
		setBirthdayInput(birthdayToInput(c?.birthday ?? null))
		setNotes(c?.notes ?? '')
		setAdminNotes(c?.adminNotes ?? '')
		setTags(Array.isArray(c?.tags) ? [...(c?.tags ?? [])] : [])
		setTagDraft('')
		setOptInWhatsApp(c?.optInWhatsApp !== false)
		setOptInMarketing(c?.optInMarketing === true)
		setSaveError(null)
		setSendBanner(null)
	}

	useEffect(() => {
		if (isCreate) seedFromClient(null)
		else seedFromClient(client)
	}, [isCreate, client])

	const [appointments, setAppointments] = useState<AppointmentData[]>([])
	useEffect(() => {
		if (isCreate || !client) {
			setAppointments([])
			return
		}
		const q = query(
			collection(db, 'appointments'),
			where('phone', '==', client.phone),
		)
		const unsub = onSnapshot(q, snap => {
			const list: AppointmentData[] = snap.docs.map(doc => {
				const d = doc.data() as Record<string, unknown>
				return {
					id: doc.id,
					startTime: (d.startTime as Timestamp) ?? new Date(),
					endTime: (d.endTime as Timestamp) ?? new Date(),
					adminBookingMode: inferAdminBookingModeFromFirestore(d),
					service: (d.service as string) ?? '',
					fullName: (d.fullName as string) ?? '',
					email: (d.email as string) ?? '',
					phone: (d.phone as string) ?? '',
					place: (d.place as AppointmentData['place']) ?? 'massage',
					scheduleTbd: d.scheduleTbd === true,
				}
			})
			list.sort((a, b) => {
				const ta = ts(a.startTime)?.getTime() ?? 0
				const tb = ts(b.startTime)?.getTime() ?? 0
				return tb - ta
			})
			setAppointments(list)
		})
		return () => unsub()
	}, [isCreate, client])

	const now = useMemo(() => new Date(), [appointments.length])
	const upcomingApt = useMemo(
		() =>
			[...appointments]
				.reverse()
				.find(a => bookingStatus(a, now) === 'upcoming') ?? null,
		[appointments, now],
	)
	const lastCompletedApt = useMemo(
		() => appointments.find(a => bookingStatus(a, now) === 'completed') ?? null,
		[appointments, now],
	)
	const lastVisitDate =
		ts(client?.lastVisitAt) ?? ts(lastCompletedApt?.startTime ?? null)
	const totalBookings = appointments.length || client?.visitCount || 0

	const canSendBirthday = !isCreate && optInWhatsApp && optInMarketing && !!birthdayInput
	const canSendReEng = !isCreate && optInWhatsApp && optInMarketing

	const addTag = () => {
		const t = tagDraft.trim()
		if (!t) return
		if (tags.includes(t)) {
			setTagDraft('')
			return
		}
		setTags(prev => [...prev, t])
		setTagDraft('')
	}

	const removeTag = (value: string) => {
		setTags(prev => prev.filter(x => x !== value))
	}

	const handleSubmit = async () => {
		setSaving(true)
		setSaveError(null)
		try {
			if (isCreate) {
				const e164 = parseWhatsappE164(phone)
				if (!e164) {
					setSaveError(t('clientsCreatePhoneRequired'))
					return
				}
				const res = await createClientByAdmin({
					phone: phone,
					firstName: firstName.trim() || '—',
					lastName: lastName.trim() || null,
					email: email.trim() || null,
					birthday: birthdayInput || null,
					notes: notes.trim() || null,
					adminNotes: adminNotes.trim() || null,
					tags,
					optInWhatsApp,
					optInMarketing,
					lastVisitPlace: place,
				})
				if (!res.ok) {
					setSaveError(
						res.reason === 'already_exists'
							? t('clientsCreateExists')
							: t('clientsCreatePhoneRequired'),
					)
					return
				}
				onCreated?.(res.phoneE164)
				onClose()
				return
			}
			if (!client) return
			const patch: ClientAdminPatch = {
				firstName: firstName.trim() || client.firstName,
				lastName: lastName.trim() || null,
				email: email.trim() || null,
				birthday: birthdayInput ? inputToBirthday(birthdayInput) : null,
				notes: notes.trim() || null,
				adminNotes: adminNotes.trim() || null,
				tags,
				optInWhatsApp,
				optInMarketing,
			}
			await updateClient(client.phone, patch)
		} catch (e) {
			setSaveError((e as Error)?.message ?? 'Save failed')
		} finally {
			setSaving(false)
		}
	}

	const handleReset = () => {
		if (isCreate) seedFromClient(null)
		else seedFromClient(client)
	}

	const sendNow = async (type: 'birthday' | 'reEngagement') => {
		if (!client) return
		if (type === 'birthday') setSendingBirthday(true)
		else setSendingReEng(true)
		setSendBanner(null)
		try {
			const res = await fetch(
				`/api/admin/clients/${encodeURIComponent(client.phone)}/send`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ type }),
				},
			)
			const data = (await res.json().catch(() => ({}))) as {
				ok?: boolean
				status?: string
				reason?: string
			}
			if (res.ok && data.ok) {
				setSendBanner({ kind: 'success', text: t('clientsSendSuccess') })
			} else if (data.status === 'skipped') {
				setSendBanner({
					kind: 'error',
					text: t('clientsSendSkipped', { reason: data.reason ?? '—' }),
				})
			} else {
				setSendBanner({ kind: 'error', text: t('clientsSendFailed') })
			}
		} catch {
			setSendBanner({ kind: 'error', text: t('clientsSendFailed') })
		} finally {
			if (type === 'birthday') setSendingBirthday(false)
			else setSendingReEng(false)
		}
	}

	if (mode === 'edit' && !client) return null

	const headerTitle = isCreate
		? t('clientsCreateTitle')
		: t('clientsCardEditTitle')

	return (
		<div
			className='fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm'
			onClick={onClose}
		>
			<div className='flex min-h-full items-center justify-center p-4'>
				<div
					className='glass-card relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-nearBlack/95 p-5 sm:p-6 text-icyWhite'
					onClick={e => e.stopPropagation()}
					role='dialog'
					aria-modal='true'
				>
					<div className='mb-5 flex items-start justify-between gap-3'>
						<div className='min-w-0'>
							<h2 className='font-serif text-xl sm:text-2xl text-icyWhite'>
								{headerTitle}
							</h2>
							{!isCreate && client?.phone && (
								<p className='mt-0.5 text-sm text-icyWhite/55'>{client.phone}</p>
							)}
						</div>
						<button
							type='button'
							onClick={onClose}
							className='-mt-1 -mr-1 shrink-0 rounded-full p-2 text-icyWhite/60 hover:bg-white/10 hover:text-icyWhite transition-colors'
							aria-label={t('clientsBtnClose')}
						>
							<X className='h-5 w-5' />
						</button>
					</div>

					{sendBanner && (
						<div
							className={clsx(
								'mb-4 rounded-lg px-3 py-2 text-sm',
								sendBanner.kind === 'success'
									? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
									: 'bg-red-500/10 text-red-200 border border-red-500/30',
							)}
						>
							{sendBanner.text}
						</div>
					)}

					{!isCreate && client && (
						<div className='mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3'>
							<StatTile
								label={t('clientsStatUpcoming')}
								value={
									upcomingApt
										? formatBratislavaDate(ts(upcomingApt.startTime)!)
										: '—'
								}
							/>
							<StatTile
								label={t('clientsStatLast')}
								value={
									lastVisitDate ? formatBratislavaDate(lastVisitDate) : '—'
								}
							/>
							<StatTile
								label={t('clientsStatTotal')}
								value={String(totalBookings)}
							/>
						</div>
					)}

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<FieldLabel label={t('clientsFieldFirstName')}>
							<Input
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								className='rounded-lg'
							/>
						</FieldLabel>
						<FieldLabel label={t('clientsFieldLastName')}>
							<Input
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								className='rounded-lg'
							/>
						</FieldLabel>
						<FieldLabel label={t('phoneHeader')}>
							<Input
								type='tel'
								value={phone}
								onChange={e => isCreate && setPhone(e.target.value)}
								readOnly={!isCreate}
								placeholder='+421 912 345 678'
								className={clsx(
									'rounded-lg',
									!isCreate && 'cursor-not-allowed text-icyWhite/60',
								)}
							/>
						</FieldLabel>
						<FieldLabel label={t('clientsFieldEmail')}>
							<Input
								type='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
								className='rounded-lg'
							/>
						</FieldLabel>
						<FieldLabel label={t('clientsFieldBirthday')}>
							<Input
								type='date'
								value={birthdayInput}
								onChange={e => setBirthdayInput(e.target.value)}
								onClick={e => {
									const input = e.currentTarget as HTMLInputElement & {
										showPicker?: () => void
									}
									try {
										input.showPicker?.()
									} catch {
										/* unsupported / not in user-gesture frame */
									}
								}}
								className='rounded-lg cursor-pointer'
							/>
						</FieldLabel>
					</div>

					<div className='mt-4'>
						<FieldLabel label={t('clientsFieldTags')}>
							<div className='rounded-lg border border-white/10 bg-white/[0.04] p-2'>
								{tags.length > 0 && (
									<div className='mb-2 flex flex-wrap gap-1.5'>
										{tags.map(value => (
											<span
												key={value}
												className='inline-flex items-center gap-1 rounded-full border border-gold-soft/35 bg-gold-soft/10 px-2 py-0.5 text-xs text-gold-glow'
											>
												<Tag className='h-3 w-3' aria-hidden />
												{value}
												<button
													type='button'
													onClick={() => removeTag(value)}
													className='ml-0.5 -mr-0.5 rounded-full text-gold-glow/70 hover:text-gold-glow transition-colors'
													aria-label='Remove tag'
												>
													<X className='h-3 w-3' />
												</button>
											</span>
										))}
									</div>
								)}
								<Input
									value={tagDraft}
									onChange={e => setTagDraft(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') {
											e.preventDefault()
											addTag()
										}
									}}
									onBlur={addTag}
									placeholder={t('clientsFieldTagsPlaceholder')}
									className='border-0 bg-transparent shadow-none focus-visible:ring-0 px-1'
								/>
							</div>
						</FieldLabel>
					</div>

					<div className='mt-4'>
						<FieldLabel label={t('clientsFieldNotes')}>
							<Textarea
								value={notes}
								onChange={e => setNotes(e.target.value)}
								rows={2}
								className='rounded-lg'
							/>
						</FieldLabel>
					</div>

					<div className='mt-4'>
						<FieldLabel label={t('clientsFieldAdminNotes')}>
							<Textarea
								value={adminNotes}
								onChange={e => setAdminNotes(e.target.value)}
								rows={2}
								className='rounded-lg border-amber-500/25 bg-amber-500/[0.04]'
								placeholder='—'
							/>
						</FieldLabel>
					</div>

					<div className='mt-4 space-y-2'>
						<label className='flex items-center gap-2 text-sm cursor-pointer'>
							<input
								type='checkbox'
								checked={optInWhatsApp}
								onChange={e => setOptInWhatsApp(e.target.checked)}
								className='h-4 w-4 rounded border-white/30 bg-white/5'
							/>
							<span className='text-icyWhite/90'>
								{t('clientsToggleOptInWhatsApp')}
							</span>
						</label>
						<label className='flex items-center gap-2 text-sm cursor-pointer'>
							<input
								type='checkbox'
								checked={optInMarketing}
								onChange={e => setOptInMarketing(e.target.checked)}
								className='h-4 w-4 rounded border-white/30 bg-white/5'
							/>
							<span className='text-icyWhite/90'>
								{t('clientsToggleOptInMarketing')}
							</span>
						</label>
					</div>

					<div className='mt-5 flex flex-wrap items-center gap-2'>
						<button
							type='button'
							disabled={saving}
							onClick={handleSubmit}
							className='inline-flex items-center gap-2 rounded-lg bg-gold-soft/20 px-4 py-2 text-sm font-medium text-gold-glow border border-gold-soft/40 hover:bg-gold-soft/30 transition-colors disabled:opacity-50'
						>
							<Save className='h-4 w-4' aria-hidden />
							{saving
								? t('clientsBtnSaving')
								: isCreate
									? t('clientsNewClient')
									: t('clientsBtnSave')}
						</button>
						<button
							type='button'
							onClick={handleReset}
							disabled={saving}
							className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-icyWhite/80 hover:bg-white/[0.08] transition-colors disabled:opacity-50'
						>
							<RotateCcw className='h-4 w-4' aria-hidden />
							{t('clientsBtnReset')}
						</button>
						{!isCreate && (
							<>
								<button
									type='button'
									disabled={!canSendBirthday || sendingBirthday}
									onClick={() => {
										if (!confirm(t('clientsConfirmSendBirthday', { name: firstName || client?.firstName || '—' }))) return
										void sendNow('birthday')
									}}
									title={
										!optInMarketing
											? t('clientsRequiresMarketingOptIn')
											: !optInWhatsApp
												? t('clientsRequiresWhatsApp')
												: !birthdayInput
													? t('clientsRequiresBirthday')
													: undefined
									}
									className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-icyWhite/85 hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
								>
									<Gift className='h-4 w-4' aria-hidden />
									{sendingBirthday
										? t('clientsBtnSending')
										: t('clientsBtnSendBirthday')}
								</button>
								<button
									type='button'
									disabled={!canSendReEng || sendingReEng}
									onClick={() => {
										if (!confirm(t('clientsConfirmSendReEngagement', { name: firstName || client?.firstName || '—' }))) return
										void sendNow('reEngagement')
									}}
									title={
										!optInMarketing
											? t('clientsRequiresMarketingOptIn')
											: !optInWhatsApp
												? t('clientsRequiresWhatsApp')
												: undefined
									}
									className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-icyWhite/85 hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
								>
									<Send className='h-4 w-4' aria-hidden />
									{sendingReEng
										? t('clientsBtnSending')
										: t('clientsBtnSendReEngagement')}
								</button>
							</>
						)}
						{saveError && (
							<span className='text-sm text-red-300'>{saveError}</span>
						)}
					</div>

					{!isCreate && client && (
						<div className='mt-6 border-t border-white/10 pt-5'>
							<h3 className='mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-icyWhite/65'>
								<Cake className='h-4 w-4' aria-hidden />
								{t('clientsVisitHistoryTitle')}
							</h3>
							{appointments.length === 0 ? (
								<div className='text-xs text-icyWhite/45'>
									{t('clientsVisitsLabel', { count: 0 })}
								</div>
							) : (
								<ul className='max-h-56 space-y-1.5 overflow-y-auto pr-1'>
									{appointments.map(apt => {
										const start = ts(apt.startTime)
										const status = bookingStatus(apt, now)
										return (
											<li
												key={apt.id}
												className='flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs'
											>
												<StatusChip status={status} />
												<span className='min-w-0 flex-1 truncate text-icyWhite/85'>
													{apt.service || '—'}
													{apt.place && (
														<span className='ml-1 text-icyWhite/45'>
															· {tCommon(apt.place)}
														</span>
													)}
												</span>
												<span className='shrink-0 text-icyWhite/55'>
													{apt.scheduleTbd
														? '—'
														: start
															? formatBratislavaDate(start)
															: '—'}
												</span>
											</li>
										)
									})}
								</ul>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function FieldLabel({
	label,
	children,
}: {
	label: string
	children: React.ReactNode
}) {
	return (
		<div className='space-y-1.5'>
			<label className='text-xs font-medium uppercase tracking-wider text-icyWhite/55'>
				{label}
			</label>
			{children}
		</div>
	)
}

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<div className='rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5'>
			<div className='text-[10px] font-semibold uppercase tracking-wider text-icyWhite/45'>
				{label}
			</div>
			<div className='mt-0.5 font-serif text-base text-icyWhite tabular-nums'>
				{value}
			</div>
		</div>
	)
}

function StatusChip({ status }: { status: BookingStatus }) {
	const t = useTranslations('admin')
	const label =
		status === 'upcoming'
			? t('clientsBookingStatusUpcoming')
			: status === 'completed'
				? t('clientsBookingStatusCompleted')
				: t('clientsBookingStatusTbd')
	return (
		<span
			className={clsx(
				'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
				status === 'upcoming' &&
					'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
				status === 'completed' &&
					'border-white/15 bg-white/[0.04] text-icyWhite/55',
				status === 'tbd' && 'border-sky-500/35 bg-sky-500/10 text-sky-200',
			)}
		>
			{label}
		</span>
	)
}
