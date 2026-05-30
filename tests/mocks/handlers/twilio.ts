/**
 * Twilio Messages API mock.
 *
 * Intercepts `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`,
 * the single endpoint our code hits (via `lib/whatsapp-admin-notify.ts`).
 *
 * Tests can assert:
 *
 *   import { requestLogs } from 'tests/mocks/server'
 *
 *   expect(requestLogs.twilio).toHaveLength(1)
 *   expect(requestLogs.twilio[0].body.get('ContentSid')).toBe('HX...')
 *   expect(requestLogs.twilio[0].body.get('To')).toBe('whatsapp:+421912345678')
 *
 * Negative paths (Twilio errors like 63016 "channel not joined", 63018
 * "template not approved") are exposed via `respondWithTwilioError(code)`.
 */

import { http, HttpResponse } from 'msw'

export interface TwilioRequestLogEntry {
	url: string
	body: URLSearchParams
	timestamp: number
}

export const twilioRequestLog: TwilioRequestLogEntry[] = []

/**
 * Generates a per-message SID — Twilio returns `SM…` (SMS) or `MM…` for media;
 * for WhatsApp it's still `SM…`. We synthesize a stable fake so tests can
 * snapshot the response shape.
 */
function fakeMessageSid(idx: number): string {
	return `SM${String(idx).padStart(32, '0')}`
}

/**
 * Helper to install a one-off error response inside a specific test. Use:
 *
 *   server.use(respondWithTwilioError(63016))
 */
export function respondWithTwilioError(code: number, message = 'simulated') {
	return http.post(
		'https://api.twilio.com/2010-04-01/Accounts/:accountSid/Messages.json',
		() =>
			HttpResponse.json(
				{
					code,
					message,
					more_info: `https://www.twilio.com/docs/errors/${code}`,
					status: 400,
				},
				{ status: 400 },
			),
	)
}

export const twilioHandlers = [
	http.post(
		'https://api.twilio.com/2010-04-01/Accounts/:accountSid/Messages.json',
		async ({ request }) => {
			const text = await request.text()
			const body = new URLSearchParams(text)
			twilioRequestLog.push({
				url: request.url,
				body,
				timestamp: Date.now(),
			})
			const idx = twilioRequestLog.length
			return HttpResponse.json(
				{
					sid: fakeMessageSid(idx),
					account_sid: 'AC' + '0'.repeat(32),
					to: body.get('To'),
					from: body.get('From'),
					body: body.get('Body'),
					status: 'queued',
					date_created: new Date().toISOString(),
					date_sent: null,
					date_updated: new Date().toISOString(),
					error_code: null,
					error_message: null,
					num_segments: '1',
					num_media: '0',
					price: null,
					price_unit: 'USD',
					direction: 'outbound-api',
					api_version: '2010-04-01',
					uri: `/2010-04-01/Accounts/AC0/Messages/${fakeMessageSid(idx)}.json`,
				},
				{ status: 201 },
			)
		},
	),
]
