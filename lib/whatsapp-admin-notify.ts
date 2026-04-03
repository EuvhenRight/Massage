/**
 * Optional admin alerts via Twilio WhatsApp (same moments as admin Resend emails).
 * No-op when Twilio env or ADMIN_WHATSAPP_PHONE is missing.
 */

export type WhatsAppNotifyResult = "skipped" | "sent" | "failed";

const BRAND = "V2studio" as const;
const TAGLINE = "Interné upozornenie" as const;
const FOOTER = "Automatické hlásenie z rezervačného systému." as const;

const LABELS = {
  newBooking: "Nová rezervácia",
  newBookingBody:
    "Práve bola potvrdená nová rezervácia. Nižšie nájdete súhrn údajov.",
  cancelled: "Zrušená rezervácia",
  cancelledBody:
    "Nasledujúca rezervácia bola v systéme zrušená. Skontrolujte kalendár.",
  sectionDetails: "Podrobnosti",
  customer: "Zákazník",
  email: "E-mail",
  date: "Dátum",
  time: "Čas",
  service: "Služba",
  appointment: "Rezervácia",
  fullDayScope: "Rozsah (celé dni)",
} as const;

const DIVIDER = "───────────────" as const;

/** WhatsApp *bold* labels, plain values — reads well on mobile */
function field(label: string, value: string): string {
  return `*${label}*\n${value}`;
}

function formatSkFullCalendarDays(count: number): string {
  if (count === 1) return "1 kalendárny deň (celý deň)";
  if (count >= 2 && count <= 4) return `${count} kalendárne dni (celý deň)`;
  return `${count} kalendárnych dní (celý deň)`;
}

function ensureWhatsAppAddress(value: string): string {
  const v = value.trim();
  if (v.startsWith("whatsapp:")) return v.replace(/\s/g, "");
  const num = v.replace(/\s/g, "");
  return num.startsWith("+") ? `whatsapp:${num}` : `whatsapp:+${num}`;
}

function buildNewBookingMessage(payload: {
  customerName: string;
  email: string;
  date: string;
  time: string;
  service: string;
  fullCalendarDayCount?: number;
}): string {
  const serviceName = payload.service || LABELS.appointment;
  const scopeLine =
    typeof payload.fullCalendarDayCount === "number" &&
    payload.fullCalendarDayCount >= 1 &&
    payload.fullCalendarDayCount <= 14
      ? `\n\n${field(LABELS.fullDayScope, formatSkFullCalendarDays(payload.fullCalendarDayCount))}`
      : "";

  const detailsSection = [
    field(LABELS.customer, payload.customerName),
    "",
    field(LABELS.email, payload.email),
    "",
    field(LABELS.date, payload.date),
    "",
    field(LABELS.time, payload.time),
    scopeLine,
    "",
    field(LABELS.service, serviceName),
  ].join("");

  return [
    `*${BRAND}*`,
    `_${TAGLINE}_`,
    "",
    DIVIDER,
    "",
    `*${LABELS.newBooking}*`,
    "",
    LABELS.newBookingBody,
    "",
    DIVIDER,
    "",
    `*${LABELS.sectionDetails}*`,
    "",
    detailsSection,
    "",
    DIVIDER,
    "",
    `_${FOOTER}_`,
  ].join("\n");
}

function buildCancelledMessage(payload: {
  customerName: string;
  email: string;
  date: string;
  time: string;
  service: string;
}): string {
  const serviceName = payload.service || LABELS.appointment;
  const detailsSection = [
    field(LABELS.customer, payload.customerName),
    "",
    field(LABELS.email, payload.email),
    "",
    field(LABELS.date, payload.date),
    "",
    field(LABELS.time, payload.time),
    "",
    field(LABELS.service, serviceName),
  ].join("");

  return [
    `*${BRAND}*`,
    `_${TAGLINE}_`,
    "",
    DIVIDER,
    "",
    `*${LABELS.cancelled}*`,
    "",
    LABELS.cancelledBody,
    "",
    DIVIDER,
    "",
    `*${LABELS.sectionDetails}*`,
    "",
    detailsSection,
    "",
    DIVIDER,
    "",
    `_${FOOTER}_`,
  ].join("\n");
}

function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM &&
      process.env.ADMIN_WHATSAPP_PHONE
  );
}

async function sendTwilioWhatsApp(body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const fromFinal = ensureWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM!);
  const toFinal = ensureWhatsAppAddress(process.env.ADMIN_WHATSAPP_PHONE!);

  if (fromFinal === toFinal) {
    console.error(
      "[whatsapp-admin] Twilio 63031: From and To are the same (%s). Set TWILIO_WHATSAPP_FROM to Twilio's sender (Console → Messaging → WhatsApp sandbox number, e.g. whatsapp:+14155238886), not your personal number. ADMIN_WHATSAPP_PHONE should be your phone (+31…) that joined the sandbox.",
      fromFinal
    );
    return { ok: false, error: "same From and To (see logs)" };
  }

  const params = new URLSearchParams();
  params.set("From", fromFinal);
  params.set("To", toFinal);
  params.set("Body", body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${token}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    logTwilioWhatsAppHint(text, fromFinal);
    return { ok: false, error: text || res.statusText };
  }

  return { ok: true };
}

/** Parse Twilio JSON errors and print fix hints (codes 63007, etc.) */
function logTwilioWhatsAppHint(responseBody: string, fromAddr: string): void {
  let code: number | undefined;
  try {
    const j = JSON.parse(responseBody) as { code?: number };
    code = typeof j.code === "number" ? j.code : undefined;
  } catch {
    return;
  }
  if (code === 63007) {
    console.error(
      "[whatsapp-admin] Twilio 63007: No WhatsApp sender matches TWILIO_WHATSAPP_FROM (%s). Open Twilio Console → Messaging → Try WhatsApp / Sandbox, copy the exact \"From\" (format whatsapp:+14155238886). Use the same Twilio account as TWILIO_ACCOUNT_SID (not a different subaccount). For production, the number must be WhatsApp-enabled on that account.",
      fromAddr
    );
  }
  if (code === 63016) {
    console.error(
      "[whatsapp-admin] Twilio 63016: Recipient has not joined the WhatsApp sandbox. From the phone in ADMIN_WHATSAPP_PHONE, open WhatsApp and send the join code (e.g. \"join <keyword>\") to the Twilio sandbox number shown in Console → Messaging → Try it out → Send a WhatsApp message."
    );
  }
}

/** Redacted summary for logs / health checks (no secrets). */
export function twilioWhatsAppEnvSummary(): {
  ready: boolean;
  hasSid: boolean;
  hasToken: boolean;
  hasFrom: boolean;
  hasAdminPhone: boolean;
} {
  return {
    ready: twilioConfigured(),
    hasSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
    hasToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    hasFrom: Boolean(process.env.TWILIO_WHATSAPP_FROM?.trim()),
    hasAdminPhone: Boolean(process.env.ADMIN_WHATSAPP_PHONE?.trim()),
  };
}

export async function notifyAdminWhatsAppNew(payload: {
  customerName: string;
  email: string;
  date: string;
  time: string;
  service: string;
  fullCalendarDayCount?: number;
}): Promise<WhatsAppNotifyResult> {
  if (!twilioConfigured()) return "skipped";
  const message = buildNewBookingMessage(payload);
  const result = await sendTwilioWhatsApp(message);
  if (!result.ok) {
    console.error("[whatsapp-admin] Twilio error:", result.error);
    return "failed";
  }
  return "sent";
}

export async function notifyAdminWhatsAppCancelled(payload: {
  customerName: string;
  email: string;
  date: string;
  time: string;
  service: string;
}): Promise<WhatsAppNotifyResult> {
  if (!twilioConfigured()) return "skipped";
  const message = buildCancelledMessage(payload);
  const result = await sendTwilioWhatsApp(message);
  if (!result.ok) {
    console.error("[whatsapp-admin] Twilio error:", result.error);
    return "failed";
  }
  return "sent";
}
