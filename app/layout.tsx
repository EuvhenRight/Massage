import type { Metadata } from "next";
import { DM_Serif_Display, Outfit } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=typeof window!=='undefined'?window.location.pathname:'';if(/\\/booking$|\\/booking\\//.test(p)||p.endsWith('/booking')){document.documentElement.classList.add('booking-page-no-scroll');}})();`,
          }}
        />
      </head>
      <body
        className={`${dmSerif.variable} ${outfit.variable} font-sans min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
