/**
 * Resend Emails API mock.
 *
 * Intercepts `POST https://api.resend.com/emails` (called by `lib/email-templates`
 * via the `resend` SDK).  Stores every request so tests can assert recipients,
 * subject, and HTML body.
 *
 * Negative scenarios via `respondWithResendError(...)`:
 *   - 422 invalid_from
 *   - 429 rate_limited
 *   - 500 transient
 */

import { http, HttpResponse } from 'msw'

export interface ResendRequestLogEntry {
	url: string
	body: {
		from?: string
		to?: string | string[]
		subject?: string
		html?: string
		text?: string
		reply_to?: string | string[]
	}
	timestamp: number
}

export const resendRequestLog: ResendRequestLogEntry[] = []

export function respondWithResendError(
	status: number,
	name = 'validation_error',
	message = 'simulated',
) {
	return http.post('https://api.resend.com/emails', () =>
		HttpResponse.json({ name, message, statusCode: status }, { status }),
	)
}

export const resendHandlers = [
	http.post('https://api.resend.com/emails', async ({ request }) => {
		const body = (await request.json()) as ResendRequestLogEntry['body']
		resendRequestLog.push({
			url: request.url,
			body,
			timestamp: Date.now(),
		})
		return HttpResponse.json(
			{
				id: `re_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
			},
			{ status: 200 },
		)
	}),
]
