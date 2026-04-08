"use client";

import CookieConsentBanner from "@/components/CookieConsentBanner";
import { CookieConsentProvider } from "@/components/CookieConsentContext";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
import { EASE_OUT, TRANSITION } from "@/lib/motion-tokens";
import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <MotionConfig reducedMotion="user" transition={{ ...TRANSITION.base, ease: EASE_OUT }}>
          <CookieConsentProvider>
            {children}
            <CookieConsentBanner />
            <ConditionalAnalytics />
          </CookieConsentProvider>
        </MotionConfig>
      </NextThemesProvider>
    </SessionProvider>
  );
}
