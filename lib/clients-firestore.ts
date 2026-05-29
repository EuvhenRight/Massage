/**
 * Customer client cards — extracted from bookings to support birthday greetings,
 * re-engagement messaging, and admin client browsing.
 *
 * Document ID: phone in E.164 (deterministic upsert key — same number = same client).
 * Phone is the canonical identity since fullName/email may vary between bookings.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	increment,
	query,
	serverTimestamp,
	setDoc,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore'
import { db } from './firebase'
import { parseWhatsappE164 } from './phone-e164'
import type { Place } from './places'

export type ClientBirthday = {
	/** Full year — stored for age analytics. Matching in cron uses month+day only. */
	year: number
	/** 1-12 */
	month: number
	/** 1-31 */
	day: number
}

export interface ClientDoc {
	/** Phone in E.164 — same as document ID. */
	phone: string
	firstName: string
	lastName: string | null
	email: string | null
	birthday: ClientBirthday | null
	firstSeenAt: Timestamp
	lastVisitAt: Timestamp
	lastVisitPlace: Place | null
	visitCount: number
	optInWhatsApp: boolean
	optInMarketing: boolean
	birthdayGreetedYear: number | null
	reEngagementSentAt: Timestamp | null
	/** Customer-facing notes — may be exposed to customer-facing tools later. */
	notes: string | null
	/** Internal admin-only notes — never sent to the customer. */
	adminNotes: string | null
	/** Free-form tags for segmentation (VIP, allergy, regular, etc.). */
	tags: string[]
	createdAt: Timestamp
	updatedAt: Timestamp
}

/** "YYYY-MM-DD" → ClientBirthday, or null when the string is empty/invalid. */
function parseBirthdayInput(value: string | undefined | null): ClientBirthday | null {
	if (!value || typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
	const [y, m, d] = trimmed.split('-').map(Number)
	if (!y || !m || !d) return null
	if (m < 1 || m > 12 || d < 1 || d > 31) return null
	return { year: y, month: m, day: d }
}

function splitFullName(fullName: string): {
	firstName: string
	lastName: string | null
} {
	const trimmed = fullName.trim()
	if (!trimmed || trimmed === '—') {
		return { firstName: trimmed || '—', lastName: null }
	}
	const parts = trimmed.split(/\s+/)
	const firstName = parts[0]!
	const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
	return { firstName, lastName }
}

export interface UpsertClientFromBookingInput {
	phone: string
	fullName: string
	email: string
	place: Place
	appointmentStartAt: Date
	/** Optional YYYY-MM-DD from the booking form. */
	birthday?: string
	/** Marketing-channel opt-in from the booking form (default false / GDPR). */
	optInMarketing?: boolean
}

export type UpsertClientResult =
	| { created: boolean; phoneE164: string }
	| { skipped: 'unparseable_phone' }

/**
 * Create or update the client doc keyed by phone E.164.
 *
 * New client: full doc with `optInWhatsApp = true` (they shared a phone for
 * reminders) and `optInMarketing = false` (GDPR — explicit consent required).
 *
 * Existing client: bumps `visitCount`, advances `lastVisitAt` only if the new
 * booking is later than the stored one (admin retro-creates bookings occasionally).
 * `birthday`, `optIn*`, `notes` are sticky — never overwritten from booking flow.
 */
export async function upsertClientFromBooking(
	input: UpsertClientFromBookingInput,
): Promise<UpsertClientResult> {
	const e164 = parseWhatsappE164(input.phone)
	if (!e164) return { skipped: 'unparseable_phone' }

	const ref = doc(db, 'clients', e164)
	const snap = await getDoc(ref)
	const startTs = Timestamp.fromDate(input.appointmentStartAt)

	if (!snap.exists()) {
		const { firstName, lastName } = splitFullName(input.fullName)
		const birthdayDoc = parseBirthdayInput(input.birthday)
		await setDoc(ref, {
			phone: e164,
			firstName,
			lastName,
			email: input.email.trim() || null,
			birthday: birthdayDoc,
			firstSeenAt: startTs,
			lastVisitAt: startTs,
			lastVisitPlace: input.place,
			visitCount: 1,
			optInWhatsApp: true,
			optInMarketing: input.optInMarketing === true,
			birthdayGreetedYear: null,
			reEngagementSentAt: null,
			notes: null,
			adminNotes: null,
			tags: [],
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		})
		return { created: true, phoneE164: e164 }
	}

	const existing = snap.data()
	const existingLastVisit = existing.lastVisitAt as Timestamp | undefined
	const updates: Record<string, unknown> = {
		visitCount: increment(1),
		updatedAt: serverTimestamp(),
	}
	if (
		!existingLastVisit ||
		startTs.toMillis() > existingLastVisit.toMillis()
	) {
		updates.lastVisitAt = startTs
		updates.lastVisitPlace = input.place
	}
	await updateDoc(ref, updates)
	return { created: false, phoneE164: e164 }
}

/**
 * Birthday match by month+day (year ignored). Filters to opted-in clients only.
 * Day filter is applied in code: ≤31 docs per month means it's cheaper than
 * maintaining a 3-field composite index.
 *
 * Caller passes month/day so they own the timezone choice (cron computes them
 * in Europe/Bratislava — the salon's wall clock, not UTC).
 */
export async function findClientsWithBirthdayOn(
	month: number,
	day: number,
): Promise<ClientDoc[]> {
	const q = query(
		collection(db, 'clients'),
		where('birthday.month', '==', month),
		where('optInMarketing', '==', true),
	)
	const snap = await getDocs(q)
	const result: ClientDoc[] = []
	for (const docSnap of snap.docs) {
		const d = docSnap.data() as ClientDoc
		if (d.birthday && d.birthday.day === day) result.push(d)
	}
	return result
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Clients whose last visit was more than `thresholdDays` ago AND who haven't
 * received a re-engagement message inside that same window.
 */
export async function findClientsForReEngagement(
	thresholdDays: number,
	now: Date,
): Promise<ClientDoc[]> {
	const cutoff = Timestamp.fromMillis(now.getTime() - thresholdDays * DAY_MS)
	const q = query(
		collection(db, 'clients'),
		where('optInMarketing', '==', true),
		where('lastVisitAt', '<=', cutoff),
	)
	const snap = await getDocs(q)
	const result: ClientDoc[] = []
	for (const docSnap of snap.docs) {
		const d = docSnap.data() as ClientDoc
		if (d.reEngagementSentAt) {
			const sentMs = d.reEngagementSentAt.toMillis()
			if (now.getTime() - sentMs < thresholdDays * DAY_MS) continue
		}
		result.push(d)
	}
	return result
}

export async function markBirthdayGreeted(
	phoneE164: string,
	year: number,
): Promise<void> {
	await updateDoc(doc(db, 'clients', phoneE164), {
		birthdayGreetedYear: year,
		updatedAt: serverTimestamp(),
	})
}

export async function markReEngagementSent(
	phoneE164: string,
	now: Date,
): Promise<void> {
	await updateDoc(doc(db, 'clients', phoneE164), {
		reEngagementSentAt: Timestamp.fromDate(now),
		updatedAt: serverTimestamp(),
	})
}

export async function getClient(phoneE164: string): Promise<ClientDoc | null> {
	const snap = await getDoc(doc(db, 'clients', phoneE164))
	if (!snap.exists()) return null
	return snap.data() as ClientDoc
}

export type ClientAdminPatch = Partial<
	Pick<
		ClientDoc,
		| 'firstName'
		| 'lastName'
		| 'email'
		| 'birthday'
		| 'optInWhatsApp'
		| 'optInMarketing'
		| 'notes'
		| 'adminNotes'
		| 'tags'
	>
>

/** Admin edit: any subset of editable fields. Booking-derived fields are not touched here. */
export async function updateClient(
	phoneE164: string,
	patch: ClientAdminPatch,
): Promise<void> {
	await updateDoc(doc(db, 'clients', phoneE164), {
		...patch,
		updatedAt: serverTimestamp(),
	})
}

export interface CreateClientByAdminInput {
	phone: string
	firstName: string
	lastName?: string | null
	email?: string | null
	birthday?: string | null
	notes?: string | null
	adminNotes?: string | null
	tags?: string[]
	optInWhatsApp?: boolean
	optInMarketing?: boolean
}

export type CreateClientResult =
	| { ok: true; phoneE164: string }
	| { ok: false; reason: 'unparseable_phone' | 'already_exists' }

/**
 * Admin-only manual client creation — bypasses the booking flow. Used by the
 * "New client" button in /admin/clients to register customers the salon meets
 * offline (walk-ins, phone bookings) so they get birthday greetings later too.
 *
 * Refuses if the phone already maps to a client (admin should open and edit
 * the existing card instead). `firstSeenAt` / `lastVisitAt` are set to "now"
 * — they will advance naturally on the first real booking.
 */
export async function createClientByAdmin(
	input: CreateClientByAdminInput,
): Promise<CreateClientResult> {
	const e164 = parseWhatsappE164(input.phone)
	if (!e164) return { ok: false, reason: 'unparseable_phone' }
	const ref = doc(db, 'clients', e164)
	const snap = await getDoc(ref)
	if (snap.exists()) return { ok: false, reason: 'already_exists' }
	const now = Timestamp.fromDate(new Date())
	await setDoc(ref, {
		phone: e164,
		firstName: input.firstName.trim() || '—',
		lastName: input.lastName?.trim() || null,
		email: input.email?.trim() || null,
		birthday: parseBirthdayInput(input.birthday ?? undefined),
		firstSeenAt: now,
		lastVisitAt: now,
		lastVisitPlace: null,
		visitCount: 0,
		optInWhatsApp: input.optInWhatsApp !== false,
		optInMarketing: input.optInMarketing === true,
		birthdayGreetedYear: null,
		reEngagementSentAt: null,
		notes: input.notes?.trim() || null,
		adminNotes: input.adminNotes?.trim() || null,
		tags: Array.isArray(input.tags) ? input.tags.filter(t => t.trim()) : [],
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	})
	return { ok: true, phoneE164: e164 }
}
