import { defaultLocale, type Locale } from "@/i18n";
import { SITE_CONFIG } from "@/lib/site-config";
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

/** Local business + WebSite JSON-LD for Google rich results and entity clarity. */
export async function JsonLd({ locale }: { locale: string }) {
  const url = getSiteUrl();
  const businessId = `${url}/#business`;
  const websiteId = `${url}/#website`;
  const bookingUrl = `${url}/${defaultLocale}/booking`;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "metadata",
  });
  const description = t("description");
  const brandImage = `${url}/images/Gemini_yellow2.png`;

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
      "@type": "BeautySalon",
      "@id": businessId,
      name: SITE_CONFIG.name,
      alternateName: ["Epilroom Bratislava", SITE_CONFIG.addressSubtitle],
      description,
      image: [DEFAULT_OG_IMAGE, brandImage],
      url,
      telephone: SITE_CONFIG.phone.replace(/\s/g, ""),
      email: SITE_CONFIG.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Križna 22",
        addressLocality: "Bratislava",
        postalCode: "811 07",
        addressCountry: "SK",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 48.1486,
        longitude: 17.1077,
      },
      hasMap: SITE_CONFIG.googleMaps,
      areaServed: {
        "@type": "City",
        name: "Bratislava",
        containedInPlace: {
          "@type": "Country",
          name: "Slovakia",
        },
      },
      sameAs: [SITE_CONFIG.instagram, SITE_CONFIG.facebook],
      priceRange: "$$",
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: bookingUrl,
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
      },
    },
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
