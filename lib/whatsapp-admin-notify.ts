/**
 * Staff + customer WhatsApp via Twilio (alongside Resend emails).
 * Staff routing by booking place:
 *   massage → MASSAGE_MASTER_WHATSAPP_PHONE or ADMIN_WHATSAPP_PHONE
 *   depilation → DEPILATION_MASTER_WHATSAPP_PHONE or ADMIN_WHATSAPP_PHONE (fallback)
 * Customer: parseable E.164 + core Twilio env.
 * Sandbox: each recipient must join the Twilio sandbox from WhatsApp (code 63016).
 * Sender display name (e.g. V2studio) is set in Twilio / Meta — TWILIO_WHATSAPP_FROM is Twilio’s WhatsApp From address, not your personal SK mobile.
 */

import { parseWhatsappE164 } from "./phone-e164";

export type WhatsAppNotifyResult = "skipped" | "sent" | "failed";

export { parseWhatsappE164 };

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

/**
 * Optional image shown as first media in the WhatsApp thread (PNG/JPEG, public HTTPS).
 * Does not replace the chat header avatar — that comes from the WhatsApp Business profile in Meta/Twilio.
 */
function optionalTwilioWhatsAppMediaUrl(): string | undefined {
  const u = process.env.TWILIO_WHATSAPP_MEDIA_URL?.trim();
  if (!u || !u.startsWith("https://")) return undefined;
  return u;
}

function twilioConfigured(): boolean {
  return Boolean(
    twilioMessagingCoreConfigured() && process.env.ADMIN_WHATSAPP_PHONE
  );
}

export type BookingPlace = "massage" | "depilation";

function depilationMasterPhoneTrimmed(): string | undefined {
  const v = process.env.DEPILATION_MASTER_WHATSAPP_PHONE?.trim();
  return v || undefined;
}

/** Massage calendar staff (defaults to ADMIN_WHATSAPP_PHONE). */
function massageStaffPhoneTrimmed(): string | undefined {
  const explicit = process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim();
  if (explicit) return explicit;
  const admin = process.env.ADMIN_WHATSAPP_PHONE?.trim();
  return admin || undefined;
}

/**
 * Single staff recipient per booking — no duplicate alerts to both numbers.
 */
export function resolveStaffRecipientPhone(
  bookingPlace: BookingPlace
): string | undefined {
  if (bookingPlace === "depilation") {
    return depilationMasterPhoneTrimmed() ?? process.env.ADMIN_WHATSAPP_PHONE?.trim();
  }
  return massageStaffPhoneTrimmed();
}

function staffLogContextForRecipient(
  bookingPlace: BookingPlace,
  resolvedPhone: string
): "admin" | "depilation-master" {
  if (bookingPlace !== "depilation") return "admin";
  const dm = depilationMasterPhoneTrimmed();
  if (dm && sameRecipientPhone(resolvedPhone, dm)) return "depilation-master";
  return "admin";
}

/** Same E.164 identity for deduping admin vs depilation master alerts. */
function sameRecipientPhone(a: string, b: string): boolean {
  try {
    const ea = parseWhatsappE164(a);
    const eb = parseWhatsappE164(b);
    if (ea && eb) return ea === eb;
  } catch {
    /* libphonenumber rare failures — fall through to string compare */
  }
  const norm = (s: string) =>
    s.replace(/\s/g, "").replace(/^whatsapp:/i, "").toLowerCase();
  return norm(a) === norm(b);
}

export type StaffWhatsAppNotifyResult = {
  staff: WhatsAppNotifyResult;
};

async function sendTwilioWhatsAppTo(
  toE164OrWhatsapp: string,
  body: string,
  logContext: "admin" | "customer" | "depilation-master"
): Promise<
  { ok: true } | { ok: false; error: string; twilioCode?: number }
> {
  if (!twilioMessagingCoreConfigured()) {
    return { ok: false, error: "Twilio messaging not configured" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const fromFinal = ensureWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM!);
  const toFinal = ensureWhatsAppAddress(toE164OrWhatsapp);

  if (fromFinal === toFinal) {
    const tag =
      logContext === "customer"
        ? "whatsapp-customer"
        : logContext === "depilation-master"
          ? "whatsapp-depilation-master"
          : "whatsapp-admin";
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
  const mediaUrl = optionalTwilioWhatsAppMediaUrl();
  if (mediaUrl) {
    params.append("MediaUrl", mediaUrl);
  }

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
    let twilioCode: number | undefined;
    try {
      const j = JSON.parse(text) as { code?: number };
      if (typeof j.code === "number") twilioCode = j.code;
    } catch {
      /* ignore */
    }
    logTwilioWhatsAppHint(text, fromFinal, logContext);
    return { ok: false, error: text || res.statusText, twilioCode };
  }

  return { ok: true };
}

/** Parse Twilio JSON errors and print fix hints (codes 63007, etc.) */
function logTwilioWhatsAppHint(
  responseBody: string,
  fromAddr: string,
  context: "admin" | "customer" | "depilation-master"
): void {
  let code: number | undefined;
  try {
    const j = JSON.parse(responseBody) as { code?: number };
    code = typeof j.code === "number" ? j.code : undefined;
  } catch {
    return;
  }
  const tag =
    context === "customer"
      ? "whatsapp-customer"
      : context === "depilation-master"
        ? "whatsapp-depilation-master"
        : "whatsapp-admin";
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
    } else if (context === "depilation-master") {
      console.error(
        "[whatsapp-depilation-master] Twilio 63016: DEPILATION_MASTER_WHATSAPP_PHONE must join the WhatsApp sandbox (same as other recipients): send \"join <keyword>\" from that handset to your Twilio sandbox number."
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
  hasMassageMasterPhone: boolean;
  hasDepilationMasterPhone: boolean;
  hasWhatsAppMediaUrl: boolean;
} {
  const hasStaffRecipient =
    Boolean(process.env.ADMIN_WHATSAPP_PHONE?.trim()) ||
    Boolean(depilationMasterPhoneTrimmed()) ||
    Boolean(process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim());
  return {
    ready: twilioMessagingCoreConfigured() && hasStaffRecipient,
    messagingCoreReady: twilioMessagingCoreConfigured(),
    hasSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
    hasToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    hasFrom: Boolean(process.env.TWILIO_WHATSAPP_FROM?.trim()),
    hasAdminPhone: Boolean(process.env.ADMIN_WHATSAPP_PHONE?.trim()),
    hasMassageMasterPhone: Boolean(
      process.env.MASSAGE_MASTER_WHATSAPP_PHONE?.trim()
    ),
    hasDepilationMasterPhone: Boolean(depilationMasterPhoneTrimmed()),
    hasWhatsAppMediaUrl: Boolean(optionalTwilioWhatsAppMediaUrl()),
  };
}

async function sendNewBookingAlertToPhone(
  rawPhone: string,
  payload: {
    customerName: string;
    email: string;
    date: string;
    time: string;
    service: string;
    fullCalendarDayCount?: number;
  },
  logContext: "admin" | "depilation-master"
): Promise<WhatsAppNotifyResult> {
  if (!twilioMessagingCoreConfigured()) return "skipped";
  const message = buildNewBookingMessage(payload);
  const result = await sendTwilioWhatsAppTo(rawPhone, message, logContext);
  if (!result.ok) {
    const tag =
      logContext === "depilation-master"
        ? "[whatsapp-depilation-master]"
        : "[whatsapp-admin]";
    console.error(`${tag} Twilio error:`, result.error);
    return "failed";
  }
  return "sent";
}

async function sendCancelledAlertToPhone(
  rawPhone: string,
  payload: {
    customerName: string;
    email: string;
    date: string;
    time: string;
    service: string;
  },
  logContext: "admin" | "depilation-master"
): Promise<WhatsAppNotifyResult> {
  if (!twilioMessagingCoreConfigured()) return "skipped";
  const message = buildCancelledMessage(payload);
  const result = await sendTwilioWhatsAppTo(rawPhone, message, logContext);
  if (!result.ok) {
    const tag =
      logContext === "depilation-master"
        ? "[whatsapp-depilation-master]"
        : "[whatsapp-admin]";
    console.error(`${tag} Twilio error:`, result.error);
    return "failed";
  }
  return "sent";
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
  return sendNewBookingAlertToPhone(
    process.env.ADMIN_WHATSAPP_PHONE!.trim(),
    payload,
    "admin"
  );
}

export async function notifyAdminWhatsAppCancelled(payload: {
  customerName: string;
  email: string;
  date: string;
  time: string;
  service: string;
}): Promise<WhatsAppNotifyResult> {
  if (!twilioConfigured()) return "skipped";
  return sendCancelledAlertToPhone(
    process.env.ADMIN_WHATSAPP_PHONE!.trim(),
    payload,
    "admin"
  );
}

/**
 * One staff WhatsApp per booking — massage vs depilation numbers from env.
 */
export async function notifyStaffWhatsAppNew(
  payload: {
    customerName: string;
    email: string;
    date: string;
    time: string;
    service: string;
    fullCalendarDayCount?: number;
  },
  options?: { bookingPlace?: BookingPlace }
): Promise<StaffWhatsAppNotifyResult> {
  const bookingPlace = options?.bookingPlace ?? "massage";
  const phone = resolveStaffRecipientPhone(bookingPlace);
  if (!phone || !twilioMessagingCoreConfigured()) {
    return { staff: "skipped" };
  }
  const ctx = staffLogContextForRecipient(bookingPlace, phone);
  const staff = await sendNewBookingAlertToPhone(phone, payload, ctx);
  return { staff };
}

export async function notifyStaffWhatsAppCancelled(
  payload: {
    customerName: string;
    email: string;
    date: string;
    time: string;
    service: string;
  },
  options?: { bookingPlace?: BookingPlace }
): Promise<StaffWhatsAppNotifyResult> {
  const bookingPlace = options?.bookingPlace ?? "massage";
  const phone = resolveStaffRecipientPhone(bookingPlace);
  if (!phone || !twilioMessagingCoreConfigured()) {
    return { staff: "skipped" };
  }
  const ctx = staffLogContextForRecipient(bookingPlace, phone);
  const staff = await sendCancelledAlertToPhone(phone, payload, ctx);
  return { staff };
}

/** Customer new-booking WhatsApp: status + Twilio error code for API/UI diagnostics. */
export async function notifyCustomerWhatsAppNew(payload: {
  customerPhone: string;
  customerName: string;
  date: string;
  time: string;
  service: string;
  fullCalendarDayCount?: number;
}): Promise<{
  status: WhatsAppNotifyResult;
  twilioCode?: number;
  skipReason?: "twilio_env" | "unparseable_phone";
}> {
  const e164 = parseWhatsappE164(payload.customerPhone);
  if (!e164) {
    return { status: "skipped", skipReason: "unparseable_phone" };
  }
  if (!twilioMessagingCoreConfigured()) {
    return { status: "skipped", skipReason: "twilio_env" };
  }
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
    return { status: "failed", twilioCode: result.twilioCode };
  }
  return { status: "sent" };
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
