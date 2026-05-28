/**
 * Twilio WhatsApp via approved Content Templates (ContentSid + ContentVariables).
 * Free-form Body= is no longer used — production WhatsApp requires templates for
 * business-initiated messages outside the 24h customer window.
 *
 * Staff routing by booking place:
 *   massage    → MASSAGE_MASTER_WHATSAPP_PHONE or ADMIN_WHATSAPP_PHONE
 *   depilation → DEPILATION_MASTER_WHATSAPP_PHONE or ADMIN_WHATSAPP_PHONE (fallback)
 *
 * Sender (TWILIO_MESSAGING_SERVICE_SID) is Twilio's WhatsApp From — sandbox
 * (whatsapp:+14155238886) or a Messaging Service SID (MG…), never your personal number.
 */

import { parseWhatsappE164 } from './phone-e164'
import { splitCatalogServiceTitle } from './split-catalog-service-title'

/** WhatsApp messages show only the booked line, not the full catalog path —
 *  e.g. "Cosmetology › Hygienic cleaning › Body › Back" → "Back". */
function serviceLineTitle(service: string): string {
	return splitCatalogServiceTitle(service).lineTitle || service
}

export type WhatsAppNotifyResult = 'skipped' | 'sent' | 'failed'

export { parseWhatsappE164 }

const CONTENT_SID_ENV = {
	bookingNew: 'TWILIO_CONTENT_SID_BOOKING_NEW',
	bookingCancelled: 'TWILIO_CONTENT_SID_BOOKING_CANCELLED',
	bookingRescheduled: 'TWILIO_CONTENT_SID_BOOKING_RESCHEDULED',
	reminder2Days: 'TWILIO_CONTENT_SID_REMINDER_2D',
	reminder1Day: 'TWILIO_CONTENT_SID_REMINDER_1D',
	reminderSameDay: 'TWILIO_CONTENT_SID_REMINDER_0D',
	staffNew: 'TWILIO_CONTENT_SID_STAFF_NEW',
	staffCancelled: 'TWILIO_CONTENT_SID_STAFF_CANCELLED',
	staffCustomerConfirmed: 'TWILIO_CONTENT_SID_STAFF_CUSTOMER_CONFIRMED',
} as const

type ContentTemplateKey = keyof typeof CONTENT_SID_ENV

function getContentSid(key: ContentTemplateKey): string | undefined {
	const v = process.env[CONTENT_SID_ENV[key]]?.trim()
	return v || undefined
}

function ensureWhatsAppAddress(value: string): string {
	const v = value.trim()
	if (v.startsWith('whatsapp:')) return v.replace(/\s/g, '')
	const num = v.replace(/\s/g, '')
	return num.startsWith('+') ? `whatsapp:${num}` : `whatsapp:+${num}`
}

function firstName(fullName: string): string {
	const part = fullName.trim().split(/\s+/)[0]
	return part || fullName.trim() || ''
}

function twilioMessagingCoreConfigured(): boolean {
	return Boolean(
		process.env.TWILIO_ACCOUNT_SID &&
		process.env.TWILIO_AUTH_TOKEN &&
		process.env.TWILIO_MESSAGING_SERVICE_SID,
	)
}

function twilioConfigured(): boolean {
	return Boolean(
		twilioMessagingCoreConfigured() && process.env.ADMIN_WHATSAPP_PHONE,
	)
}

export type BookingPlace = 'massage' | 'depilation'

function depilationMasterPhoneTrimmed(): string | undefined {
	const v = process.env.DEPILATION_MASTER_WHATSAPP_PHONE?.trim()
	return v || undefined
}

function massageStaffPhoneTrimmed(): string | undefined {
	const explicit = process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim()
	if (explicit) return explicit
	const admin = process.env.ADMIN_WHATSAPP_PHONE?.trim()
	return admin || undefined
}

export function resolveStaffRecipientPhone(
	bookingPlace: BookingPlace,
): string | undefined {
	if (bookingPlace === 'depilation') {
		return (
			depilationMasterPhoneTrimmed() ?? process.env.ADMIN_WHATSAPP_PHONE?.trim()
		)
	}
	return massageStaffPhoneTrimmed()
}

function staffLogContextForRecipient(
	bookingPlace: BookingPlace,
	resolvedPhone: string,
): 'admin' | 'depilation-master' {
	if (bookingPlace !== 'depilation') return 'admin'
	const dm = depilationMasterPhoneTrimmed()
	if (dm && sameRecipientPhone(resolvedPhone, dm)) return 'depilation-master'
	return 'admin'
}

function sameRecipientPhone(a: string, b: string): boolean {
	try {
		const ea = parseWhatsappE164(a)
		const eb = parseWhatsappE164(b)
		if (ea && eb) return ea === eb
	} catch {
		/* libphonenumber rare failures — fall through to string compare */
	}
	const norm = (s: string) =>
		s
			.replace(/\s/g, '')
			.replace(/^whatsapp:/i, '')
			.toLowerCase()
	return norm(a) === norm(b)
}

export type StaffWhatsAppNotifyResult = {
	staff: WhatsAppNotifyResult
}

type LogContext = 'admin' | 'customer' | 'depilation-master'

async function sendTwilioWhatsAppTemplate(
	toE164OrWhatsapp: string,
	templateKey: ContentTemplateKey,
	variables: Record<string, string>,
	logContext: LogContext,
): Promise<{ ok: true } | { ok: false; error: string; twilioCode?: number }> {
	if (!twilioMessagingCoreConfigured()) {
		return { ok: false, error: 'Twilio messaging not configured' }
	}
	const contentSid = getContentSid(templateKey)
	if (!contentSid) {
		return {
			ok: false,
			error: `Missing ${CONTENT_SID_ENV[templateKey]} env var`,
		}
	}

	const accountSid = process.env.TWILIO_ACCOUNT_SID!
	const token = process.env.TWILIO_AUTH_TOKEN!
	const senderRaw = process.env.TWILIO_MESSAGING_SERVICE_SID!.trim()
	const senderIsMessagingService = /^MG[0-9a-f]{32}$/i.test(senderRaw)
	const fromFinal = senderIsMessagingService
		? senderRaw
		: ensureWhatsAppAddress(senderRaw)
	const toFinal = ensureWhatsAppAddress(toE164OrWhatsapp)

	if (!senderIsMessagingService && fromFinal === toFinal) {
		const tag =
			logContext === 'customer'
				? 'whatsapp-customer'
				: logContext === 'depilation-master'
					? 'whatsapp-depilation-master'
					: 'whatsapp-admin'
		console.error(
			"[%s] Twilio 63031: From and To are the same (%s). Set TWILIO_MESSAGING_SERVICE_SID to Twilio's sandbox sender (e.g. whatsapp:+14155238886) or a Messaging Service SID (MG…), not the recipient number.",
			tag,
			fromFinal,
		)
		return { ok: false, error: 'same From and To (see logs)' }
	}

	const params = new URLSearchParams()
	if (senderIsMessagingService) {
		params.set('MessagingServiceSid', senderRaw)
	} else {
		params.set('From', fromFinal)
	}
	params.set('To', toFinal)
	params.set('ContentSid', contentSid)
	params.set('ContentVariables', JSON.stringify(variables))

	const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
	const auth = Buffer.from(`${accountSid}:${token}`).toString('base64')

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: params.toString(),
	})

	if (!res.ok) {
		const text = await res.text()
		let twilioCode: number | undefined
		try {
			const j = JSON.parse(text) as { code?: number }
			if (typeof j.code === 'number') twilioCode = j.code
		} catch {
			/* ignore */
		}
		logTwilioWhatsAppHint(text, fromFinal, logContext)
		return { ok: false, error: text || res.statusText, twilioCode }
	}

	return { ok: true }
}

function logTwilioWhatsAppHint(
	responseBody: string,
	fromAddr: string,
	context: LogContext,
): void {
	let code: number | undefined
	try {
		const j = JSON.parse(responseBody) as { code?: number }
		code = typeof j.code === 'number' ? j.code : undefined
	} catch {
		return
	}
	const tag =
		context === 'customer'
			? 'whatsapp-customer'
			: context === 'depilation-master'
				? 'whatsapp-depilation-master'
				: 'whatsapp-admin'
	if (code === 63007) {
		console.error(
			'[%s] Twilio 63007: No WhatsApp sender matches TWILIO_MESSAGING_SERVICE_SID (%s). Open Twilio Console → Messaging → Try WhatsApp / Sandbox, copy the exact "From" (format whatsapp:+14155238886). Use the same Twilio account as TWILIO_ACCOUNT_SID.',
			tag,
			fromAddr,
		)
	}
	if (code === 63016) {
		if (context === 'admin') {
			console.error(
				'[whatsapp-admin] Twilio 63016: Recipient has not joined the WhatsApp sandbox. From the phone in ADMIN_WHATSAPP_PHONE, open WhatsApp and send "join <keyword>" to the Twilio sandbox number.',
			)
		} else if (context === 'depilation-master') {
			console.error(
				'[whatsapp-depilation-master] Twilio 63016: DEPILATION_MASTER_WHATSAPP_PHONE must join the WhatsApp sandbox: send "join <keyword>" from that handset to the Twilio sandbox number.',
			)
		} else {
			console.error(
				'[whatsapp-customer] Twilio 63016: The customer\'s phone has not joined the WhatsApp sandbox. They must send "join <keyword>" to your Twilio sandbox number.',
			)
		}
	}
	if (code === 63018) {
		console.error(
			'[%s] Twilio 63018: Content template not approved or mismatched language/variables. Check the ContentSid is the approved one and that ContentVariables keys match {{n}} placeholders exactly.',
			tag,
		)
	}
}

export function twilioWhatsAppEnvSummary(): {
	ready: boolean
	messagingCoreReady: boolean
	hasSid: boolean
	hasToken: boolean
	hasFrom: boolean
	hasAdminPhone: boolean
	hasMassageMasterPhone: boolean
	hasDepilationMasterPhone: boolean
	contentSids: Record<ContentTemplateKey, boolean>
} {
	const hasStaffRecipient =
		Boolean(process.env.ADMIN_WHATSAPP_PHONE?.trim()) ||
		Boolean(depilationMasterPhoneTrimmed()) ||
		Boolean(process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim())
	const contentSids = {} as Record<ContentTemplateKey, boolean>
	for (const key of Object.keys(CONTENT_SID_ENV) as ContentTemplateKey[]) {
		contentSids[key] = Boolean(getContentSid(key))
	}
	return {
		ready: twilioMessagingCoreConfigured() && hasStaffRecipient,
		messagingCoreReady: twilioMessagingCoreConfigured(),
		hasSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
		hasToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
		hasFrom: Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()),
		hasAdminPhone: Boolean(process.env.ADMIN_WHATSAPP_PHONE?.trim()),
		hasMassageMasterPhone: Boolean(
			process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim(),
		),
		hasDepilationMasterPhone: Boolean(depilationMasterPhoneTrimmed()),
		contentSids,
	}
}

/* ============================ Staff (admin/master) ============================ */

type StaffNewPayload = {
	customerName: string
	customerPhone: string
	email: string
	date: string
	time: string
	service: string
}

type StaffCancelPayload = {
	customerName: string
	customerPhone: string
	date: string
	time: string
	service: string
}

async function sendStaffNew(
	rawPhone: string,
	payload: StaffNewPayload,
	logContext: 'admin' | 'depilation-master',
): Promise<WhatsAppNotifyResult> {
	if (!twilioMessagingCoreConfigured()) return 'skipped'
	const result = await sendTwilioWhatsAppTemplate(
		rawPhone,
		'staffNew',
		{
			'1': payload.customerName,
			'2': payload.customerPhone,
			'3': payload.email,
			'4': serviceLineTitle(payload.service),
			'5': payload.date,
			'6': payload.time,
		},
		logContext,
	)
	if (!result.ok) {
		const tag =
			logContext === 'depilation-master'
				? '[whatsapp-depilation-master]'
				: '[whatsapp-admin]'
		console.error(`${tag} Twilio error:`, result.error)
		return 'failed'
	}
	return 'sent'
}

async function sendStaffCancelled(
	rawPhone: string,
	payload: StaffCancelPayload,
	logContext: 'admin' | 'depilation-master',
): Promise<WhatsAppNotifyResult> {
	if (!twilioMessagingCoreConfigured()) return 'skipped'
	const result = await sendTwilioWhatsAppTemplate(
		rawPhone,
		'staffCancelled',
		{
			'1': payload.customerName,
			'2': payload.customerPhone,
			'3': serviceLineTitle(payload.service),
			'4': payload.date,
			'5': payload.time,
		},
		logContext,
	)
	if (!result.ok) {
		const tag =
			logContext === 'depilation-master'
				? '[whatsapp-depilation-master]'
				: '[whatsapp-admin]'
		console.error(`${tag} Twilio error:`, result.error)
		return 'failed'
	}
	return 'sent'
}

export async function notifyAdminWhatsAppNew(
	payload: StaffNewPayload,
): Promise<WhatsAppNotifyResult> {
	if (!twilioConfigured()) return 'skipped'
	return sendStaffNew(
		process.env.ADMIN_WHATSAPP_PHONE!.trim(),
		payload,
		'admin',
	)
}

export async function notifyAdminWhatsAppCancelled(
	payload: StaffCancelPayload,
): Promise<WhatsAppNotifyResult> {
	if (!twilioConfigured()) return 'skipped'
	return sendStaffCancelled(
		process.env.ADMIN_WHATSAPP_PHONE!.trim(),
		payload,
		'admin',
	)
}

export async function notifyStaffWhatsAppNew(
	payload: StaffNewPayload,
	options?: { bookingPlace?: BookingPlace },
): Promise<StaffWhatsAppNotifyResult> {
	const bookingPlace = options?.bookingPlace ?? 'massage'
	const phone = resolveStaffRecipientPhone(bookingPlace)
	if (!phone || !twilioMessagingCoreConfigured()) {
		return { staff: 'skipped' }
	}
	const ctx = staffLogContextForRecipient(bookingPlace, phone)
	const staff = await sendStaffNew(phone, payload, ctx)
	return { staff }
}

export async function notifyStaffWhatsAppCancelled(
	payload: StaffCancelPayload,
	options?: { bookingPlace?: BookingPlace },
): Promise<StaffWhatsAppNotifyResult> {
	const bookingPlace = options?.bookingPlace ?? 'massage'
	const phone = resolveStaffRecipientPhone(bookingPlace)
	if (!phone || !twilioMessagingCoreConfigured()) {
		return { staff: 'skipped' }
	}
	const ctx = staffLogContextForRecipient(bookingPlace, phone)
	const staff = await sendStaffCancelled(phone, payload, ctx)
	return { staff }
}

/** Customer pressed "Potvrdiť" on a reminder — tell the master the booking is confirmed. */
export async function notifyStaffWhatsAppCustomerConfirmed(
	payload: {
		customerName: string
		customerPhone: string
		service: string
		date: string
		time: string
	},
	options?: { bookingPlace?: BookingPlace },
): Promise<StaffWhatsAppNotifyResult> {
	const bookingPlace = options?.bookingPlace ?? 'massage'
	const phone = resolveStaffRecipientPhone(bookingPlace)
	if (!phone || !twilioMessagingCoreConfigured()) {
		return { staff: 'skipped' }
	}
	if (!getContentSid('staffCustomerConfirmed')) {
		return { staff: 'skipped' }
	}
	const ctx = staffLogContextForRecipient(bookingPlace, phone)
	const result = await sendTwilioWhatsAppTemplate(
		phone,
		'staffCustomerConfirmed',
		{
			'1': payload.customerName,
			'2': payload.customerPhone,
			'3': serviceLineTitle(payload.service),
			'4': payload.date,
			'5': payload.time,
		},
		ctx,
	)
	if (!result.ok) {
		const tag =
			ctx === 'depilation-master'
				? '[whatsapp-depilation-master]'
				: '[whatsapp-admin]'
		console.error(`${tag} Twilio error:`, result.error)
		return { staff: 'failed' }
	}
	return { staff: 'sent' }
}

/* ============================ Customer ============================ */

export async function notifyCustomerWhatsAppNew(payload: {
	customerPhone: string
	customerName: string
	date: string
	time: string
	service: string
}): Promise<{
	status: WhatsAppNotifyResult
	twilioCode?: number
	skipReason?: 'twilio_env' | 'unparseable_phone' | 'missing_content_sid'
}> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164) return { status: 'skipped', skipReason: 'unparseable_phone' }
	if (!twilioMessagingCoreConfigured()) {
		return { status: 'skipped', skipReason: 'twilio_env' }
	}
	if (!getContentSid('bookingNew')) {
		return { status: 'skipped', skipReason: 'missing_content_sid' }
	}
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'bookingNew',
		{
			'1': firstName(payload.customerName),
			'2': serviceLineTitle(payload.service),
			'3': payload.date,
			'4': payload.time,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return { status: 'failed', twilioCode: result.twilioCode }
	}
	return { status: 'sent' }
}

export async function notifyCustomerWhatsAppRescheduled(payload: {
	customerPhone: string
	customerName: string
	service: string
	oldDate: string
	oldTime: string
	newDate: string
	newTime: string
}): Promise<{
	status: WhatsAppNotifyResult
	twilioCode?: number
	skipReason?: 'twilio_env' | 'unparseable_phone' | 'missing_content_sid'
}> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164) return { status: 'skipped', skipReason: 'unparseable_phone' }
	if (!twilioMessagingCoreConfigured()) {
		return { status: 'skipped', skipReason: 'twilio_env' }
	}
	if (!getContentSid('bookingRescheduled')) {
		return { status: 'skipped', skipReason: 'missing_content_sid' }
	}
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'bookingRescheduled',
		{
			'1': firstName(payload.customerName),
			'2': serviceLineTitle(payload.service),
			'3': payload.oldDate,
			'4': payload.oldTime,
			'5': payload.newDate,
			'6': payload.newTime,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return { status: 'failed', twilioCode: result.twilioCode }
	}
	return { status: 'sent' }
}

export async function notifyCustomerWhatsAppCancelled(payload: {
	customerPhone: string
	customerName: string
	date: string
	time: string
	service: string
}): Promise<WhatsAppNotifyResult> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164 || !twilioMessagingCoreConfigured()) return 'skipped'
	if (!getContentSid('bookingCancelled')) return 'skipped'
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'bookingCancelled',
		{
			'1': serviceLineTitle(payload.service),
			'2': payload.date,
			'3': payload.time,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return 'failed'
	}
	return 'sent'
}

/* ============================ Reminders (cron) ============================ */

/** 2-day reminder with confirm/cancel URL buttons. `actionToken` is the signed
 *  token used by both buttons; the path (/confirm vs /cancel) encodes intent. */
export async function notifyCustomerWhatsAppReminder2Days(payload: {
	customerPhone: string
	customerName: string
	service: string
	date: string
	time: string
	actionToken: string
}): Promise<{
	status: WhatsAppNotifyResult
	twilioCode?: number
	skipReason?: 'twilio_env' | 'unparseable_phone' | 'missing_content_sid'
}> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164) return { status: 'skipped', skipReason: 'unparseable_phone' }
	if (!twilioMessagingCoreConfigured()) {
		return { status: 'skipped', skipReason: 'twilio_env' }
	}
	if (!getContentSid('reminder2Days')) {
		return { status: 'skipped', skipReason: 'missing_content_sid' }
	}
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'reminder2Days',
		{
			'1': firstName(payload.customerName),
			'2': serviceLineTitle(payload.service),
			'3': payload.date,
			'4': payload.time,
			'5': payload.actionToken,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return { status: 'failed', twilioCode: result.twilioCode }
	}
	return { status: 'sent' }
}

export async function notifyCustomerWhatsAppReminder1Day(payload: {
	customerPhone: string
	customerName: string
	service: string
	date: string
	time: string
	actionToken: string
}): Promise<{
	status: WhatsAppNotifyResult
	twilioCode?: number
	skipReason?: 'twilio_env' | 'unparseable_phone' | 'missing_content_sid'
}> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164) return { status: 'skipped', skipReason: 'unparseable_phone' }
	if (!twilioMessagingCoreConfigured()) {
		return { status: 'skipped', skipReason: 'twilio_env' }
	}
	if (!getContentSid('reminder1Day')) {
		return { status: 'skipped', skipReason: 'missing_content_sid' }
	}
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'reminder1Day',
		{
			'1': firstName(payload.customerName),
			'2': serviceLineTitle(payload.service),
			'3': payload.date,
			'4': payload.time,
			'5': payload.actionToken,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return { status: 'failed', twilioCode: result.twilioCode }
	}
	return { status: 'sent' }
}

export async function notifyCustomerWhatsAppReminderSameDay(payload: {
	customerPhone: string
	customerName: string
	service: string
	date: string
	time: string
	actionToken: string
}): Promise<{
	status: WhatsAppNotifyResult
	twilioCode?: number
	skipReason?: 'twilio_env' | 'unparseable_phone' | 'missing_content_sid'
}> {
	const e164 = parseWhatsappE164(payload.customerPhone)
	if (!e164) return { status: 'skipped', skipReason: 'unparseable_phone' }
	if (!twilioMessagingCoreConfigured()) {
		return { status: 'skipped', skipReason: 'twilio_env' }
	}
	if (!getContentSid('reminderSameDay')) {
		return { status: 'skipped', skipReason: 'missing_content_sid' }
	}
	const result = await sendTwilioWhatsAppTemplate(
		e164,
		'reminderSameDay',
		{
			'1': firstName(payload.customerName),
			'2': serviceLineTitle(payload.service),
			'3': payload.date,
			'4': payload.time,
			'5': payload.actionToken,
		},
		'customer',
	)
	if (!result.ok) {
		console.error('[whatsapp-customer] Twilio error:', result.error)
		return { status: 'failed', twilioCode: result.twilioCode }
	}
	return { status: 'sent' }
}
