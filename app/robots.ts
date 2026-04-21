import type { MetadataRoute } from "next";
import { locales } from "@/i18n";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const adminPaths = locales.map((loc) => `/${loc}/admin`);
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...adminPaths],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
