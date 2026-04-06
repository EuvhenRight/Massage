import { SITE_CONFIG } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/site-url";

/** Local business structured data for rich results (address, hours placeholders). */
export function JsonLd() {
  const url = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: SITE_CONFIG.name,
    description: `${SITE_CONFIG.name} — massage and depilation in Bratislava.`,
    image: `${url}/images/logo-v.svg`,
    url,
    telephone: SITE_CONFIG.phone,
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
    sameAs: [SITE_CONFIG.instagram, SITE_CONFIG.facebook],
    priceRange: "$$",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
