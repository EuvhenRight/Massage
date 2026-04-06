import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "@/i18n";
import { SITE_CONFIG } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/site-url";
import {
  getTwitterCreatorHandle,
  getTwitterSiteHandle,
} from "@/lib/social-seo";

/** Default share image (absolute URL; SVG is weak for some social crawlers). */
export const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&h=630&fit=crop&q=80";

export type SeoPageKey =
  | "home"
  | "massage"
  | "depilation"
  | "booking"
  | "massageBooking"
  | "depilationBooking"
  | "massagePrice"
  | "depilationPrice"
  | "cookies"
  | "privacy";

const PATH_BY_KEY: Record<SeoPageKey, string> = {
  home: "",
  massage: "massage",
  depilation: "depilation",
  booking: "booking",
  massageBooking: "massage/booking",
  depilationBooking: "depilation/booking",
  massagePrice: "massage/price",
  depilationPrice: "depilation/price",
  cookies: "cookies",
  privacy: "privacy",
};

/** Paths after locale for sitemap (same order as typical nav importance). */
export const SITEMAP_PATH_SEGMENTS: readonly string[] = [
  "",
  "massage",
  "depilation",
  "booking",
  "massage/booking",
  "depilation/booking",
  "massage/price",
  "depilation/price",
  "cookies",
  "privacy",
];

export function hreflangForLocale(locale: Locale): string {
  switch (locale) {
    case "sk":
      return "sk-SK";
    case "en":
      return "en";
    case "ru":
      return "ru";
    case "uk":
      return "uk";
    default:
      return locale;
  }
}

function openGraphLocaleTag(locale: string): string {
  switch (locale) {
    case "sk":
      return "sk_SK";
    case "en":
      return "en_GB";
    case "ru":
      return "ru";
    case "uk":
      return "uk";
    default:
      return locale;
  }
}

/** hreflang map + x-default for a path after locale (e.g. `/massage` or ``). */
export function buildAlternateLanguages(pathAfterLocale: string): Record<string, string> {
  const base = getSiteUrl();
  const suffix = pathAfterLocale === "" ? "" : `/${pathAfterLocale}`;
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[hreflangForLocale(loc)] = `${base}/${loc}${suffix}`;
  }
  languages["x-default"] = `${base}/${defaultLocale}${suffix}`;
  return languages;
}

export async function buildPageMetadata(
  locale: string,
  pageKey: SeoPageKey
): Promise<Metadata> {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "metadata",
  });
  const base = getSiteUrl();
  const pathSeg = PATH_BY_KEY[pageKey];
  const suffix = pathSeg === "" ? "" : `/${pathSeg}`;
  const canonical = `${base}/${locale}${suffix}`;

  const title =
    pageKey === "home" ? t("title") : t(`pages.${pageKey}.title`);
  const description =
    pageKey === "home" ? t("description") : t(`pages.${pageKey}.description`);

  const ogLocale = openGraphLocaleTag(locale);
  const alternateLocale = locales
    .filter((l) => l !== locale)
    .map(openGraphLocaleTag);

  const twitterSite = getTwitterSiteHandle();
  const twitterCreator = getTwitterCreatorHandle();

  return {
    title,
    description,
    keywords: t("keywords"),
    alternates: {
      canonical,
      languages: buildAlternateLanguages(pathSeg),
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale,
      url: canonical,
      siteName: t("siteName"),
      title,
      description,
      emails: SITE_CONFIG.email,
      phoneNumbers: SITE_CONFIG.phone,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          secureUrl: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      ...(twitterSite ? { site: twitterSite } : {}),
      ...(twitterCreator ? { creator: twitterCreator } : {}),
      title,
      description,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: title,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
