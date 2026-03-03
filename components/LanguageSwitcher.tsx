"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import { locales, type Locale } from "@/i18n";

const LOCALE_LABELS: Record<Locale, string> = {
  sk: "SK",
  en: "EN",
  ru: "RU",
  uk: "UK",
};

interface LanguageSwitcherProps {
  variant?: "site" | "admin";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "site",
  className = "",
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params?.locale as Locale) ?? (variant === "admin" ? "ru" : "sk");

  const order = variant === "admin"
    ? (["ru", "sk", "en", "uk"] as const)
    : (["sk", "en", "ru", "uk"] as const);

  const switchPath = (newLocale: Locale) => {
    if (!pathname) return `/${newLocale}`;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      segments[0] = newLocale;
      return "/" + segments.join("/");
    }
    return `/${newLocale}${pathname.startsWith("/") ? pathname : "/" + pathname}`;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {order.map((locale) => (
        <Link
          key={locale}
          href={switchPath(locale)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            currentLocale === locale
              ? "bg-gold-soft/25 text-gold-glow border border-gold-soft/50"
              : "text-icyWhite/60 hover:text-icyWhite hover:bg-white/5"
          }`}
          aria-label={`Switch to ${LOCALE_LABELS[locale]}`}
          aria-current={currentLocale === locale ? "true" : undefined}
        >
          {LOCALE_LABELS[locale]}
        </Link>
      ))}
    </div>
  );
}
