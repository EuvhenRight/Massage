/**
 * Professional appointment email templates for Aurora Salon.
 * Uses table-based layout and inline CSS for maximum email client compatibility.
 */

const BRAND = {
  name: "Aurora Salon",
  gold: "#b8860b",
  goldLight: "#d4af37",
  dark: "#1a1a1a",
  text: "#333333",
  muted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
};

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: ${BRAND.text};
  margin: 0;
  padding: 0;
`;

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
        &copy; ${new Date().getFullYear()} Aurora Salon &middot; Luxury Massage &amp; Depilation
      </td>
    </tr>
  </table>
</body>
</html>`;
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
            Luxury Salon
          </p>
          <span style="display: inline-block; margin-top: 20px; padding: 6px 16px; background: ${statusColor}; color: white; font-size: 12px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
            ${status}
          </span>
        </td>
      </tr>
    </table>`;
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
    </tr>`;
}

function footerSection(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
      <tr>
        <td style="padding: 24px 40px; background: ${BRAND.bg}; border-top: 1px solid ${BRAND.border};">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: ${BRAND.muted};">
            <strong>Need to make changes?</strong>
          </p>
          <p style="margin: 0; font-size: 13px; color: ${BRAND.text};">
            Contact us to reschedule or cancel. We recommend arriving 10 minutes early.
          </p>
        </td>
      </tr>
    </table>`;
}

export function buildConfirmationEmail(customerName: string, date: string, time: string, service: string): string {
  const inner = `
    ${header("Confirmed", "#059669")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            Hi ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            Your appointment at Aurora Salon has been confirmed. We look forward to welcoming you.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow("Date", date)}
            ${detailRow("Time", time)}
            ${detailRow("Service", service || "Appointment")}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            Please arrive 10 minutes early to ensure a relaxed check-in.
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`;

  return emailWrapper(inner);
}

export function buildRescheduledEmail(
  customerName: string,
  service: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string
): string {
  const inner = `
    ${header("Rescheduled", "#d97706")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            Hi ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            Your appointment has been rescheduled. Here are your updated details.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow("Service", service || "Appointment")}
            ${detailRow("Previous time", `${oldDate} at ${oldTime}`)}
            ${detailRow("New time", `${newDate} at ${newTime}`)}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            Please arrive 10 minutes early for your new appointment time.
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`;

  return emailWrapper(inner);
}

export function buildCancelledEmail(customerName: string, date: string, time: string, service: string): string {
  const inner = `
    ${header("Cancelled", "#6b7280")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            Hi ${customerName},
          </p>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: ${BRAND.text};">
            Your appointment at Aurora Salon has been cancelled as requested.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow("Date", date)}
            ${detailRow("Time", time)}
            ${detailRow("Service", service || "Appointment")}
          </table>
          <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND.muted};">
            We hope to see you again soon. Book a new appointment whenever you're ready.
          </p>
        </td>
      </tr>
    </table>
    ${footerSection()}`;

  return emailWrapper(inner);
}

export function buildAdminNewBooking(customerName: string, email: string, date: string, time: string, service: string): string {
  const inner = `
    ${header("New Booking", BRAND.gold)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            A new appointment has been booked.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow("Customer", customerName)}
            ${detailRow("Email", `<a href="mailto:${email}" style="color: ${BRAND.gold}; text-decoration: none;">${email}</a>`)}
            ${detailRow("Date", date)}
            ${detailRow("Time", time)}
            ${detailRow("Service", service || "Appointment")}
          </table>
        </td>
      </tr>
    </table>`;

  return emailWrapper(inner);
}

export function buildAdminCancelled(customerName: string, email: string, date: string, time: string, service: string): string {
  const inner = `
    ${header("Cancelled", "#6b7280")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px;">
      <tr>
        <td>
          <p style="margin: 0 0 24px 0; font-size: 16px; color: ${BRAND.text};">
            An appointment has been cancelled.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.bg}; border-radius: 8px; padding: 20px;">
            ${detailRow("Customer", customerName)}
            ${detailRow("Email", `<a href="mailto:${email}" style="color: ${BRAND.gold}; text-decoration: none;">${email}</a>`)}
            ${detailRow("Date", date)}
            ${detailRow("Time", time)}
            ${detailRow("Service", service || "Appointment")}
          </table>
        </td>
      </tr>
    </table>`;

  return emailWrapper(inner);
}
