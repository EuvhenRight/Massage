"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { locales, type Locale } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALE_LABELS: Record<Locale, string> = {
  sk: "SK",
  en: "EN",
  ru: "RU",
  uk: "UK",
};

const LOCALE_FLAG_EMOJI: Record<Locale, string> = {
  sk: "🇸🇰",
  en: "🇬🇧",
  ru: "🇷🇺",
  uk: "🇺🇦",
};

function FlagCircle({ locale }: { locale: Locale }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-base"
      aria-hidden
    >
      <span>{LOCALE_FLAG_EMOJI[locale]}</span>
    </span>
  );
}

interface LanguageSwitcherProps {
  variant?: "site" | "admin";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "site",
  className = "",
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const currentLocale = (params?.locale as Locale) ?? (variant === "admin" ? "ru" : "sk");
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  const order = variant === "admin"
    ? (["ru", "sk", "en", "uk"] as const)
    : (["sk", "en", "ru", "uk"] as const);

  const getHref = (targetLocale: Locale) => {
    if (!pathname) return `/${targetLocale}`;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      segments[0] = targetLocale;
      return "/" + segments.join("/");
    }
    return `/${targetLocale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  };

  useEffect(() => {
    if (pendingLocale && params?.locale === pendingLocale) {
      setPendingLocale(null);
    }
  }, [params?.locale, pendingLocale]);

  const handleLocaleChange = (locale: Locale) => {
    if (locale === currentLocale) return;
    setPendingLocale(locale);
    router.push(getHref(locale), { scroll: false });
  };

  const isNavigating = pendingLocale !== null;

  return (
    <div className={`flex flex-col items-center gap-1 [&_button]:bg-transparent [&_button]:shadow-none ${className}`}>
      <Select
        value={currentLocale}
        onValueChange={handleLocaleChange}
        disabled={isNavigating}
        aria-label="Select language"
      >
        <SelectTrigger
          className="relative h-9 w-9 min-w-9 shrink-0 rounded-full border-0 border-none bg-transparent p-0 shadow-none outline-none text-icyWhite hover:opacity-80 focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack [&>svg]:hidden"
        >
          {isNavigating && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full z-10" aria-hidden>
              <Loader2 className="h-4 w-4 animate-spin text-gold-soft" />
            </span>
          )}
          <SelectValue>
            <span className={`flex h-full w-full items-center justify-center ${isNavigating ? "invisible" : ""}`} aria-hidden>
              <FlagCircle locale={currentLocale} />
            </span>
          </SelectValue>
        </SelectTrigger>
      <SelectContent className="min-w-[72px]">
        {order.map((locale) => (
          <SelectItem
            key={locale}
            value={locale}
            className="cursor-pointer flex flex-col items-center gap-1 py-2"
          >
            <FlagCircle locale={locale} />
            <span className="text-xs font-semibold uppercase">{LOCALE_LABELS[locale]}</span>
          </SelectItem>
        ))}
      </SelectContent>
      </Select>
      <span className="text-[10px] font-semibold uppercase leading-none text-icyWhite pointer-events-none">
        {LOCALE_LABELS[currentLocale]}
      </span>
    </div>
  );
}
