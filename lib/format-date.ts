/**
 * Locale-aware date/time formatting.
 * Use these helpers instead of toLocaleDateString("en-US", ...) for i18n.
 */

type SupportedLocale = "sk" | "en" | "ru" | "uk";

/**
 * All supported UI locales use 24-hour times in `formatTime` / `formatTimeFromHourMinute`
 * (consistent and unambiguous across sk, en, ru, uk).
 */
export function localeUses24HourClock(_locale: string): boolean {
  return true;
}

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
  const { locale = "sk", hour12: hour12Opt, ...intlOpts } = options;
  const hour12 =
    hour12Opt !== undefined ? hour12Opt : !localeUses24HourClock(locale);
  return date.toLocaleTimeString(locale as string, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
    ...intlOpts,
  });
}

/** Time label from wall-clock hour/minute (e.g. grid axis, "HH:mm" slot strings). */
export function formatTimeFromHourMinute(
  hour: number,
  minute: number,
  locale: string
): string {
  const d = new Date(2000, 0, 1, hour, minute, 0, 0);
  return formatTime(d, { locale });
}

/** Display a wall time from booking slot string `HH:mm` using the active locale. */
export function formatTimeFromSlotString(time: string, locale: string): string {
  const parts = time.trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  return formatTimeFromHourMinute(h, m, locale);
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

/** Format time for email body (default site locale, same rules as `formatTime`) */
export function formatTimeForEmail(date: Date): string {
  return formatTime(date, { locale: EMAIL_LOCALE });
}
