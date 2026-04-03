/**
 * Admin + customer WhatsApp via Twilio (alongside Resend emails).
 * Admin: requires ADMIN_WHATSAPP_PHONE + core Twilio env.
 * Customer: requires parseable E.164 phone in the request + core Twilio env.
 * Sandbox: each recipient must join the Twilio sandbox from WhatsApp (code 63016).
 */

import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type WhatsAppNotifyResult = "skipped" | "sent" | "failed";

const BRAND = "V2studio" as const;
const TAGLINE = "Interné upozornenie" as const;
const FOOTER = "Automatické hlásenie z rezervačného systému." as const;

const CUST_FOOTER =
  "Ak ide o omyl alebo máte otázky, napíšte nám cez kontakt na webe." as const;

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

/**
 * Regions to try when the number looks national (leading 0) or has no +/country code.
 * Slovakia first (salon default), then common EU/neighbour states for this audience.
 */
const WHATSAPP_NATIONAL_DEFAULTS: CountryCode[] = [
  "SK",
  "CZ",
  "PL",
  "UA",
  "HU",
  "AT",
  "DE",
  "NL",
  "BE",
  "RO",
  "IT",
  "FR",
  "ES",
  "GB",
  "CH",
  "SE",
  "NO",
  "DK",
  "IE",
  "PT",
  "GR",
  "BG",
  "HR",
  "SI",
  "LT",
  "LV",
  "EE",
  "FI",
  "LU",
  "MD",
  "RS",
];

function e164IfValid(value: string): string | null {
  const pn = parsePhoneNumberFromString(value);
  if (!pn?.isValid()) return null;
  return pn.format("E.164");
}

/**
 * E.164 with leading +, or null if the value cannot be used as a WhatsApp recipient.
 * Uses libphonenumber: + / 00 international, country-code-only digit strings (380…, 31…),
 * and national formats (0…) resolved against likely regions (SK first, then EU/UA/etc.).
 */
export function parseWhatsappE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return null;

  const compactNoPlus = trimmed.replace(/[\s\-().]/g, "");
  if (compactNoPlus.startsWith("00")) {
    const intl = `+${compactNoPlus.slice(2)}`;
    const from00 = e164IfValid(intl);
    if (from00) return from00;
  }

  const direct = e164IfValid(trimmed);
  if (direct) return direct;

  for (const region of WHATSAPP_NATIONAL_DEFAULTS) {
    const pn = parsePhoneNumberFromString(trimmed, region);
    if (pn?.isValid()) return pn.format("E.164");
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) return null;

  if (!digitsOnly.startsWith("0")) {
    const intl = e164IfValid(`+${digitsOnly}`);
    if (intl) return intl;
  }

  return null;
}

function firstNameGreeting(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "dobrý deň";
}

const CUST_LABELS = {
  newTitle: "Rezervácia potvrdená",
  newIntro: "Ďakujeme. Nižšie nájdete súhrn vašej rezervácie.",
  cancelledTitle: "Rezervácia zrušená",
  cancelledIntro:
    "Týmto vás informujeme, že nasledujúca rezervácia bola zrušená.",
  date: "Dátum",
  time: "Čas",
  service: "Služba",
  appointment: "Rezervácia",
  fullDayScope: "Rozsah (celé dni)",
} as const;

function buildCustomerNewMessage(payload: {
  customerName: string;
  date: string;
  time: string;
  service: string;
  fullCalendarDayCount?: number;
}): string {
  const serviceName = payload.service || CUST_LABELS.appointment;
  const scopeLine =
    typeof payload.fullCalendarDayCount === "number" &&
    payload.fullCalendarDayCount >= 1 &&
    payload.fullCalendarDayCount <= 14
      ? `\n\n${field(CUST_LABELS.fullDayScope, formatSkFullCalendarDays(payload.fullCalendarDayCount))}`
      : "";

  const details = [
    field(CUST_LABELS.date, payload.date),
    "",
    field(CUST_LABELS.time, payload.time),
    scopeLine,
    "",
    field(CUST_LABELS.service, serviceName),
  ].join("");

  const greet = firstNameGreeting(payload.customerName);

  return [
    `*${BRAND}*`,
    "",
    `Dobrý deň, ${greet}!`,
    "",
    `*${CUST_LABELS.newTitle}*`,
    "",
    CUST_LABELS.newIntro,
    "",
    DIVIDER,
    "",
    details,
    "",
    DIVIDER,
    "",
    `_${CUST_FOOTER}_`,
  ].join("\n");
}

function buildCustomerCancelledMessage(payload: {
  customerName: string;
  date: string;
  time: string;
  service: string;
}): string {
  const serviceName = payload.service || CUST_LABELS.appointment;
  const greet = firstNameGreeting(payload.customerName);
  const details = [
    field(CUST_LABELS.date, payload.date),
    "",
    field(CUST_LABELS.time, payload.time),
    "",
    field(CUST_LABELS.service, serviceName),
  ].join("");

  return [
    `*${BRAND}*`,
    "",
    `Dobrý deň, ${greet}!`,
    "",
    `*${CUST_LABELS.cancelledTitle}*`,
    "",
    CUST_LABELS.cancelledIntro,
    "",
    DIVIDER,
    "",
    details,
    "",
    DIVIDER,
    "",
    `_${CUST_FOOTER}_`,
  ].join("\n");
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

function twilioMessagingCoreConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}

function twilioConfigured(): boolean {
  return Boolean(
    twilioMessagingCoreConfigured() && process.env.ADMIN_WHATSAPP_PHONE
  );
}

async function sendTwilioWhatsAppTo(
  toE164OrWhatsapp: string,
  body: string,
  logContext: "admin" | "customer"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!twilioMessagingCoreConfigured()) {
    return { ok: false, error: "Twilio messaging not configured" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const fromFinal = ensureWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM!);
  const toFinal = ensureWhatsAppAddress(toE164OrWhatsapp);

  if (fromFinal === toFinal) {
    const tag = logContext === "admin" ? "whatsapp-admin" : "whatsapp-customer";
    console.error(
      "[%s] Twilio 63031: From and To are the same (%s). Set TWILIO_WHATSAPP_FROM to Twilio's sandbox sender (e.g. whatsapp:+14155238886), not the recipient number.",
      tag,
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
    logTwilioWhatsAppHint(text, fromFinal, logContext);
    return { ok: false, error: text || res.statusText };
  }

  return { ok: true };
}

/** Parse Twilio JSON errors and print fix hints (codes 63007, etc.) */
function logTwilioWhatsAppHint(
  responseBody: string,
  fromAddr: string,
  context: "admin" | "customer"
): void {
  let code: number | undefined;
  try {
    const j = JSON.parse(responseBody) as { code?: number };
    code = typeof j.code === "number" ? j.code : undefined;
  } catch {
    return;
  }
  const tag = context === "admin" ? "whatsapp-admin" : "whatsapp-customer";
  if (code === 63007) {
    console.error(
      "[%s] Twilio 63007: No WhatsApp sender matches TWILIO_WHATSAPP_FROM (%s). Open Twilio Console → Messaging → Try WhatsApp / Sandbox, copy the exact \"From\" (format whatsapp:+14155238886). Use the same Twilio account as TWILIO_ACCOUNT_SID (not a different subaccount). For production, the number must be WhatsApp-enabled on that account.",
      tag,
      fromAddr
    );
  }
  if (code === 63016) {
    if (context === "admin") {
      console.error(
        "[whatsapp-admin] Twilio 63016: Recipient has not joined the WhatsApp sandbox. From the phone in ADMIN_WHATSAPP_PHONE, open WhatsApp and send the join code (e.g. \"join <keyword>\") to the Twilio sandbox number shown in Console → Messaging → Try it out → Send a WhatsApp message."
      );
    } else {
      console.error(
        "[whatsapp-customer] Twilio 63016: The customer's phone has not joined the WhatsApp sandbox. They must open WhatsApp on that number and send \"join <keyword>\" to your Twilio sandbox number (Console → Messaging → Try it out)."
      );
    }
  }
}

/** Redacted summary for logs / health checks (no secrets). */
export function twilioWhatsAppEnvSummary(): {
  ready: boolean;
  messagingCoreReady: boolean;
  hasSid: boolean;
  hasToken: boolean;
  hasFrom: boolean;
  hasAdminPhone: boolean;
} {
  return {
    ready: twilioConfigured(),
    messagingCoreReady: twilioMessagingCoreConfigured(),
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
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE!.trim();
  const message = buildNewBookingMessage(payload);
  const result = await sendTwilioWhatsAppTo(adminPhone, message, "admin");
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
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE!.trim();
  const message = buildCancelledMessage(payload);
  const result = await sendTwilioWhatsAppTo(adminPhone, message, "admin");
  if (!result.ok) {
    console.error("[whatsapp-admin] Twilio error:", result.error);
    return "failed";
  }
  return "sent";
}

export async function notifyCustomerWhatsAppNew(payload: {
  customerPhone: string;
  customerName: string;
  date: string;
  time: string;
  service: string;
  fullCalendarDayCount?: number;
}): Promise<WhatsAppNotifyResult> {
  const e164 = parseWhatsappE164(payload.customerPhone);
  if (!e164 || !twilioMessagingCoreConfigured()) return "skipped";
  const message = buildCustomerNewMessage({
    customerName: payload.customerName,
    date: payload.date,
    time: payload.time,
    service: payload.service,
    fullCalendarDayCount: payload.fullCalendarDayCount,
  });
  const result = await sendTwilioWhatsAppTo(e164, message, "customer");
  if (!result.ok) {
    console.error("[whatsapp-customer] Twilio error:", result.error);
    return "failed";
  }
  return "sent";
}

export async function notifyCustomerWhatsAppCancelled(payload: {
  customerPhone: string;
  customerName: string;
  date: string;
  time: string;
  service: string;
}): Promise<WhatsAppNotifyResult> {
  const e164 = parseWhatsappE164(payload.customerPhone);
  if (!e164 || !twilioMessagingCoreConfigured()) return "skipped";
  const message = buildCustomerCancelledMessage({
    customerName: payload.customerName,
    date: payload.date,
    time: payload.time,
    service: payload.service,
  });
  const result = await sendTwilioWhatsAppTo(e164, message, "customer");
  if (!result.ok) {
    console.error("[whatsapp-customer] Twilio error:", result.error);
    return "failed";
  }
  return "sent";
}
