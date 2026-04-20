/**
 * Canonical HTTPS origin for metadata, sitemap, robots, and JSON-LD.
 *
 * **Always set `NEXT_PUBLIC_SITE_URL` in production** to your public domain
 * (no trailing slash), e.g. `https://v2studio.sk`. On Vercel with a custom
 * domain, `VERCEL_URL` is usually `*.vercel.app` — using it alone splits SEO
 * signals from your real domain.
 *
 * Resolution: `NEXT_PUBLIC_SITE_URL` → `https://$VERCEL_URL` → localhost.
 */
let warnedMissingPublicSiteUrl = false;

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (
      process.env.VERCEL_ENV === "production" &&
      !warnedMissingPublicSiteUrl
    ) {
      warnedMissingPublicSiteUrl = true;
      console.warn(
        "[seo] NEXT_PUBLIC_SITE_URL is unset on Vercel production. Canonical URLs, sitemap, and JSON-LD use VERCEL_URL (" +
          host +
          "). Set NEXT_PUBLIC_SITE_URL to your live domain (https://…).",
      );
    }
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
