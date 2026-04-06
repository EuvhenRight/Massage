/**
 * Single source of truth for customer phone parsing (UI validation, Firestore, WhatsApp/Twilio).
 * Aligns with libphonenumber-js and the same regional defaults used for WhatsApp delivery.
 */

import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Regions to try when the number looks national (leading 0) or has no +/country code.
 * Slovakia first (salon default), then common EU/neighbour states for this audience.
 */
export const CUSTOMER_PHONE_REGION_DEFAULTS: CountryCode[] = [
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
 * E.164 with leading +, or null if the value cannot be used as a WhatsApp / SMS recipient.
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

  for (const region of CUSTOMER_PHONE_REGION_DEFAULTS) {
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

/** Pretty-print for UI when we already have a valid E.164 string. */
export function formatPhoneInternationalDisplay(e164: string): string | null {
  const pn = parsePhoneNumberFromString(e164);
  if (!pn?.isValid()) return null;
  return pn.formatInternational();
}

/**
 * Prefer canonical E.164 for storage; fall back to trimmed input if parsing fails (legacy / admin).
 */
export function normalizeStoredPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return trimmed;
  const e164 = parseWhatsappE164(trimmed);
  return e164 ?? trimmed;
}
