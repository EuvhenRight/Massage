import { SITE_CONFIG } from "@/lib/site-config";
import {
  getLinkedInUrlFromEnv,
  getTelegramUrlFromEnv,
} from "@/lib/social-seo";

/**
 * Open Graph extras not covered by the Metadata API alone:
 * - Facebook: article:publisher
 * - Cross-network: og:see_also (related profiles; helps some crawlers / rich context)
 * WhatsApp, Instagram, Telegram link previews use standard og:title, og:description, og:image from Metadata.
 */
export function SocialExtraMeta() {
  const linkedin = getLinkedInUrlFromEnv();
  const telegram = getTelegramUrlFromEnv();

  const seeAlso = [
    SITE_CONFIG.instagram,
    SITE_CONFIG.facebook,
    linkedin,
    telegram,
  ].filter((u): u is string => Boolean(u));

  return (
    <>
      <meta property="article:publisher" content={SITE_CONFIG.facebook} />
      {seeAlso.map((url) => (
        <meta key={url} property="og:see_also" content={url} />
      ))}
    </>
  );
}
