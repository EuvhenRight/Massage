import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Outfit } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SocialExtraMeta } from "@/components/SocialExtraMeta";
import { SITE_CONFIG } from "@/lib/site-config";
import { getFacebookAppIdFromEnv } from "@/lib/social-seo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

const siteUrl = getSiteUrl();
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const facebookAppId = getFacebookAppIdFromEnv();

/** Lets `env(safe-area-inset-*)` apply on notched iPhones (fixed CTAs, cookie bar). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "V2studio",
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  referrer: "strict-origin-when-cross-origin",
  icons: {
    icon: "/images/logo-v.svg",
    apple: "/images/logo-v.svg",
  },
  ...(facebookAppId ? { facebook: { appId: facebookAppId } } : {}),
  ...(googleVerification
    ? {
        verification: {
          google: googleVerification,
        },
      }
    : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <SocialExtraMeta />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=typeof window!=='undefined'?window.location.pathname:'';if(/\\/booking$|\\/booking\\//.test(p)||p.endsWith('/booking')){document.documentElement.classList.add('booking-page-no-scroll');}})();`,
          }}
        />
      </head>
      <body
        className={`${dmSerif.variable} ${outfit.variable} font-sans antialiased overflow-x-clip`}
      >
        {children}
      </body>
    </html>
  );
}
