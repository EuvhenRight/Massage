import type { MetadataRoute } from "next";
import { locales } from "@/i18n";
import { buildAlternateLanguages, SITEMAP_PATH_SEGMENTS } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const pathSeg of SITEMAP_PATH_SEGMENTS) {
    for (const loc of locales) {
      const suffix = pathSeg === "" ? "" : `/${pathSeg}`;
      const url = `${base}/${loc}${suffix}`;
      const languages = buildAlternateLanguages(pathSeg);
      const isHome = pathSeg === "";
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: isHome ? "weekly" : "monthly",
        priority: isHome ? 1 : pathSeg.includes("booking") ? 0.85 : 0.75,
        alternates: { languages },
      });
    }
  }

  return entries;
}
