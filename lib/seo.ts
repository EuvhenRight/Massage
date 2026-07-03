import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "@/i18n";
import { SITE_CONFIG } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/site-url";
import {
  getTwitterCreatorHandle,
  getTwitterSiteHandle,
} from "@/lib/social-seo";

/**
 * Shared branded 1200×630 social preview.
 *
 * One image across all pages so Facebook, LinkedIn, X, WhatsApp, and Telegram
 * render an identical preview. LinkedIn requires ≥1200×627 with 1.91:1 aspect
 * for its large card; the smaller portrait `Gemini_yellow.png` would degrade
 * to a square thumbnail there.
 */
const BRANDED_SOCIAL_IMAGE = "/images/social-og-1200x630.jpg";

export const OG_IMAGE_HOME = BRANDED_SOCIAL_IMAGE;
export const OG_IMAGE_MASSAGE = BRANDED_SOCIAL_IMAGE;
export const OG_IMAGE_DEPILATION = BRANDED_SOCIAL_IMAGE;

/** JSON-LD `image` field for BeautySalon entity. */
export const DEFAULT_OG_IMAGE = BRANDED_SOCIAL_IMAGE;

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

export function ogImageUrlForPageKey(pageKey: SeoPageKey): string {
  switch (pageKey) {
    case "massage":
    case "massageBooking":
    case "massagePrice":
      return OG_IMAGE_MASSAGE;
    case "depilation":
    case "depilationBooking":
    case "depilationPrice":
      return OG_IMAGE_DEPILATION;
    default:
      return OG_IMAGE_HOME;
  }
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
  const ogImage = ogImageUrlForPageKey(pageKey);

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
          url: ogImage,
          secureUrl: ogImage,
          width: 1200,
          height: 630,
          alt: title,
          type: ogImage.endsWith(".png") ? "image/png" : "image/jpeg",
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
          url: ogImage,
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
