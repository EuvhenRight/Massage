/**
 * MSW node server — the single interception point for every outgoing HTTP
 * request inside Vitest. Hooked into the global lifecycle by
 * `tests/setup.ts` (listen / reset / close).
 *
 * Per-test override pattern:
 *
 *   server.use(
 *     http.post('https://api.twilio.com/...', () => HttpResponse.json({...}, { status: 500 }))
 *   )
 *
 * The override applies to the current test only — `server.resetHandlers()`
 * in afterEach restores the defaults below.
 */

import { setupServer } from 'msw/node'
import { twilioHandlers, twilioRequestLog } from './handlers/twilio'
import { resendHandlers, resendRequestLog } from './handlers/resend'

export const server = setupServer(...twilioHandlers, ...resendHandlers)

/** Re-export per-handler request logs so tests can assert what was sent. */
export const requestLogs = {
	twilio: twilioRequestLog,
	resend: resendRequestLog,
}
