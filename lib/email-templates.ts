/**
 * Professional appointment email templates for Aurora Salon.
 * Emails are always sent in Slovak (default site language).
 * Uses table-based layout and inline CSS for maximum email client compatibility.
 */

const T = {
	confirmed: 'Potvrdené',
	rescheduled: 'Presunuté',
	cancelled: 'Zrušené',
	newBooking: 'Nová rezervácia',
	luxurySalon: 'Luxusný salón',
	date: 'Dátum',
	time: 'Čas',
	service: 'Služba',
	customer: 'Zákazník',
	previousTime: 'Predchádzajúci termín',
	newTime: 'Nový termín',
	hi: 'Ahoj',
	confirmedBody:
		'Vaša rezervácia v salóne Aurora bola potvrdená. Tešíme sa na Vašu návštevu.',
	arriveEarly:
		'Prosíme prijdite o 10 minút skôr, aby ste sa v pohode stihli prihlásiť.',
	rescheduledBody: 'Vaša rezervácia bola presunutá. Tu sú aktualizované údaje.',
	arriveEarlyResched: 'Prosíme prijdite o 10 minút skôr na nový termín.',
	cancelledBody:
		'Vaša rezervácia v salóne Aurora bola podľa požiadavky zrušená.',
	hopeToSee:
		'Dúfame, že sa opäť uvidíme. Rezervujte si nový termín, kedykoľvek budete pripravení.',
	newBookingAdmin: 'Bola vytvorená nová rezervácia.',
	cancelledAdmin: 'Rezervácia bola zrušená.',
	needChanges: 'Potrebujete zmeniť termín?',
	contactUs:
		'Kontaktujte nás na presun alebo zrušenie. Odporúčame prijsť o 10 minút skôr.',
	appointment: 'Rezervácia',
	/** Full calendar days (customer TBD / multi-day service) */
	fullDayScope: 'Rozsah',
} as const

function formatSkFullCalendarDays(count: number): string {
	if (count === 1) return "1 kalendárny deň (celý deň)"
	if (count >= 2 && count <= 4) return `${count} kalendárne dni (celý deň)`
	return `${count} kalendárnych dní (celý deň)`
}

const BRAND = {
	name: 'Aurora Salon',
	gold: '#C89E00',
	goldLight: '#E8B800',
	dark: '#1a1a1a',
	text: '#333333',
	muted: '#6b7280',
	border: '#e5e7eb',
	bg: '#f9fafb',
	white: '#ffffff',
}

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: ${BRAND.text};
  margin: 0;
  padding: 0;
`

function emailWrapper(html: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Salon</title>
</head>
<body style="${BASE_STYLES} background-color: ${BRAND.bg}; padding: 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto;">
    <tr>
      <td style="background: ${BRAND.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
        ${html}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; text-align: center; font-size: 12px; color: ${BRAND.muted};">
        &copy; ${new Date().getFullYear()} Aurora Salon &middot; Luxusný salón masáží a depilácie
      </td>
    </tr>
  </table>
</body>
</html>`
}

function header(status: string, statusColor: string): string {
	return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND.dark} 0%, #2d2d2d 100%);">
      <tr>
        <td style="padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: ${BRAND.white}; letter-spacing: 0.5px;">
            Aurora
          </h1>
          <p style="margin: 0; font-size: 12px; color: ${BRAND.goldLight}; letter-spacing: 2px; text-transform: uppercase;">
            ${T.luxurySalon}
          </p>
          <span style="display: inline-block; margin-top: 20px; padding: 6px 16px; background: ${statusColor}; color: white; font-size: 12px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
            ${status}
          </span>
        </td>
      </tr>
    </table>`
}

function detailRow(label: string, value: string): string {
	return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid ${BRAND.border}; font-size: 14px; color: ${BRAND.muted}; width: 40%;">
        ${label}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid ${BRAND.border}; font-size: 14px; font-weight: 500; color: ${BRAND.text};">
        ${value}
      </td>
    </tr>`
}

function footerSection(): string {
	return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
      <tr>
        <td style="padding: 24px 40px; background: ${BRAND.bg}; border-top: 1px solid ${BRAND.border};">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: ${BRAND.muted};">
            <strong>${T.needChanges}</strong>
          </p>
          <p style="margin: 0; font-size: 13px; color: ${BRAND.text};">
            ${T.contactUs}
          </p>
        </td>
      </tr>
    </table>`
}

export function buildConfirmationEmail(
	customerName: string,
	date: string,
	time: string,
	service: string,
	fullCalendarDayCount?: number,
): string {
	const scopeRow =
		typeof fullCalendarDayCount === "number" &&
		fullCalendarDayCount >= 1 &&
		fullCalendarDayCount <= 14
			? detailRow(T.fullDayScope, formatSkFullCalendarDays(fullCalendarDayCount))
			: ""
	const inner = `
    ${header(T.confirmed, '#059669')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            ${T.hi} ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            ${T.confirmedBody}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow(T.date, date)}
            ${detailRow(T.time, time)}
            ${scopeRow}
            ${detailRow(T.service, service || T.appointment)}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            ${T.arriveEarly}
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`

	return emailWrapper(inner)
}

export function buildRescheduledEmail(
	customerName: string,
	service: string,
	oldDate: string,
	oldTime: string,
	newDate: string,
	newTime: string,
): string {
	const inner = `
    ${header(T.rescheduled, '#d97706')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            ${T.hi} ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            ${T.rescheduledBody}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow(T.service, service || T.appointment)}
            ${detailRow(T.previousTime, `${oldDate} o ${oldTime}`)}
            ${detailRow(T.newTime, `${newDate} o ${newTime}`)}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            ${T.arriveEarlyResched}
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`

	return emailWrapper(inner)
}

export function buildCancelledEmail(
	customerName: string,
	date: string,
	time: string,
	service: string,
): string {
	const inner = `
    ${header(T.cancelled, '#6b7280')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            ${T.hi} ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            ${T.cancelledBody}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow(T.date, date)}
            ${detailRow(T.time, time)}
            ${detailRow(T.service, service || T.appointment)}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            ${T.hopeToSee}
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`

	return emailWrapper(inner)
}

export function buildAdminNewBooking(
	customerName: string,
	email: string,
	date: string,
	time: string,
	service: string,
	fullCalendarDayCount?: number,
): string {
	const scopeRow =
		typeof fullCalendarDayCount === "number" &&
		fullCalendarDayCount >= 1 &&
		fullCalendarDayCount <= 14
			? detailRow(T.fullDayScope, formatSkFullCalendarDays(fullCalendarDayCount))
			: ""
	const inner = `
    ${header(T.newBooking, BRAND.gold)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            ${T.newBookingAdmin}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow(T.customer, customerName)}
            ${detailRow('Email', `<a href="mailto:${email}" style="color: ${BRAND.gold}; text-decoration: none;">${email}</a>`)}
            ${detailRow(T.date, date)}
            ${detailRow(T.time, time)}
            ${scopeRow}
            ${detailRow(T.service, service || T.appointment)}
          </table>
        </td>
      </tr>
    </table>`

	return emailWrapper(inner)
}

export function buildAdminCancelled(
	customerName: string,
	email: string,
	date: string,
	time: string,
	service: string,
): string {
	const inner = `
    ${header(T.cancelled, '#6b7280')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            ${T.cancelledAdmin}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow(T.customer, customerName)}
            ${detailRow('Email', `<a href="mailto:${email}" style="color: ${BRAND.gold}; text-decoration: none;">${email}</a>`)}
            ${detailRow(T.date, date)}
            ${detailRow(T.time, time)}
            ${detailRow(T.service, service || T.appointment)}
          </table>
        </td>
      </tr>
    </table>`

	return emailWrapper(inner)
}
