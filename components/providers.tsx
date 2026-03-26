"use client";

import CookieConsentBanner from "@/components/CookieConsentBanner";
import { CookieConsentProvider } from "@/components/CookieConsentContext";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <CookieConsentProvider>
          {children}
          <CookieConsentBanner />
          <ConditionalAnalytics />
        </CookieConsentProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
