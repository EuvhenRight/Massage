/**
 * Resolve which channels a customer notification should go out on, from the
 * `/api/send-confirmation` request body. Mirrors the customer's channel choice
 * stored on the appointment (`notifyByEmail` / `notifyByWhatsApp`).
 *
 * Email is treated as the safe default (on unless explicitly disabled) so legacy
 * appointments without stored flags still get an email. WhatsApp policy differs
 * by message type:
 *   - new booking: the public flow always sends explicit flags, so WhatsApp is
 *     on unless explicitly disabled (`defaultWhatsApp: true`).
 *   - reschedule / cancel: admin-initiated; WhatsApp is opt-in so a legacy
 *     appointment (no flag) never gets an unexpected WhatsApp (`defaultWhatsApp:
 *     false`).
 *
 * Flags may arrive as real booleans (server) or strings (form encoding), hence
 * the `"true"`/`"false"` comparisons.
 */
/**
 * Mutually exclusive channel selection used by the booking flow: exactly one of
 * email / WhatsApp is always active. Setting one channel to a value forces the
 * other to the opposite — turning one on turns the other off, turning one off
 * turns the other on.
 */
export function toggleNotifyChannel(
  channel: "email" | "whatsapp",
  value: boolean
): { email: boolean; whatsapp: boolean } {
  return channel === "email"
    ? { email: value, whatsapp: !value }
    : { email: !value, whatsapp: value };
}

export function resolveNotifyChannels(
  body: { notifyByEmail?: unknown; notifyByWhatsApp?: unknown },
  opts?: { defaultWhatsApp?: boolean }
): { email: boolean; whatsapp: boolean } {
  const email = body.notifyByEmail !== false && body.notifyByEmail !== "false";
  const whatsapp = opts?.defaultWhatsApp
    ? body.notifyByWhatsApp !== false && body.notifyByWhatsApp !== "false"
    : body.notifyByWhatsApp === true || body.notifyByWhatsApp === "true";
  return { email, whatsapp };
}
