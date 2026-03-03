/**
 * Locale-aware date/time formatting.
 * Use these helpers instead of toLocaleDateString("en-US", ...) for i18n.
 */

type SupportedLocale = "sk" | "en" | "ru" | "uk";

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions & { locale?: string } = {}
): string {
  const { locale = "sk", ...opts } = options;
  return date.toLocaleDateString(locale as string, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export function formatTime(
  date: Date,
  options: Intl.DateTimeFormatOptions & { locale?: string } = {}
): string {
  const { locale = "sk", ...opts } = options;
  return date.toLocaleTimeString(locale as string, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

export function formatDateShort(
  date: Date,
  locale: string = "sk"
): string {
  return date.toLocaleDateString(locale, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatMonthYear(date: Date, locale: string = "sk"): string {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekdayShort(date: Date, locale: string = "sk"): string {
  return date.toLocaleDateString(locale, { weekday: "short" });
}

/** For emails: always use Slovak (default site language) */
export const EMAIL_LOCALE: SupportedLocale = "sk";

/** Format date for email body (Slovak) */
export function formatDateForEmail(date: Date): string {
  return date.toLocaleDateString(EMAIL_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format time for email body (Slovak) */
export function formatTimeForEmail(date: Date): string {
  return date.toLocaleTimeString(EMAIL_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
