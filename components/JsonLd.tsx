import { defaultLocale, type Locale } from "@/i18n";
import { PLACE_CONTACTS, SITE_CONFIG } from "@/lib/site-config";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import { getTranslations } from "next-intl/server";

function hreflangTag(locale: string): string {
  switch (locale) {
    case "sk":
      return "sk-SK";
    case "en":
      return "en-GB";
    case "ru":
      return "ru";
    case "uk":
      return "uk";
    default:
      return locale;
  }
}

const AREA_SERVED = {
  "@type": "City",
  name: "Bratislava",
  containedInPlace: {
    "@type": "Country",
    name: "Slovakia",
  },
} as const;

/**
 * Local business + WebSite JSON-LD for Google rich results and entity clarity.
 *
 * The studio operates two locations with separate addresses and phone numbers,
 * so the graph models an `Organization` with two branch nodes rather than a
 * single business. Emitting one node made Google attribute the depilation
 * address and phone to the massage page as well.
 *
 * This component renders from the locale layout, which does not know which
 * page is open — hence both branches are always present, each with its own
 * `@id`, address, phone and booking action. Page-level metadata (og:phone,
 * og:email) is narrowed per page in `lib/seo.ts`.
 */
export async function JsonLd({ locale }: { locale: string }) {
  const url = getSiteUrl();
  const businessId = `${url}/#business`;
  const websiteId = `${url}/#website`;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "metadata",
  });
  const description = t("description");
  const brandImage = `${url}/images/Gemini_yellow2.png`;

  const branch = (
    place: keyof typeof PLACE_CONTACTS,
    type: "BeautySalon" | "DaySpa",
    extra: Record<string, unknown> = {}
  ) => {
    const c = PLACE_CONTACTS[place];
    const social = [c.instagram, c.facebook].flatMap((v) => (v ? [v] : []));
    return {
      "@type": type,
      "@id": `${url}/#${place}`,
      name: SITE_CONFIG.name,
      description,
      image: [DEFAULT_OG_IMAGE, brandImage],
      url: `${url}/${defaultLocale}/${place}`,
      telephone: c.phone.replace(/\s/g, ""),
      email: c.email,
      address: {
        "@type": "PostalAddress",
        ...c.postal,
      },
      geo: {
        "@type": "GeoCoordinates",
        ...c.geo,
      },
      hasMap: c.googleMaps,
      areaServed: AREA_SERVED,
      parentOrganization: { "@id": businessId },
      priceRange: "$$",
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${url}/${defaultLocale}/${place}/booking`,
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
      },
      // Only the depilation location has social profiles so far.
      ...(social.length ? { sameAs: social } : {}),
      ...extra,
    };
  };

  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url,
      name: SITE_CONFIG.name,
      description,
      inLanguage: hreflangTag(locale),
      publisher: { "@id": businessId },
    },
    {
      "@type": "Organization",
      "@id": businessId,
      name: SITE_CONFIG.name,
      url,
      logo: brandImage,
      image: [DEFAULT_OG_IMAGE, brandImage],
      email: SITE_CONFIG.email,
      areaServed: AREA_SERVED,
      sameAs: [SITE_CONFIG.instagram, SITE_CONFIG.facebook],
      department: [
        { "@id": `${url}/#massage` },
        { "@id": `${url}/#depilation` },
      ],
    },
    branch("massage", "DaySpa"),
    branch("depilation", "BeautySalon", {
      alternateName: ["Epilroom Bratislava", SITE_CONFIG.addressSubtitle],
    }),
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
