"use client";

import CookieConsentBanner from "@/components/CookieConsentBanner";
import { CookieConsentProvider } from "@/components/CookieConsentContext";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
import MotionDebugOverlay from "@/components/MotionDebugOverlay";
import { EASE_OUT, TRANSITION } from "@/lib/motion-tokens";
import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {/*
          reducedMotion="never" — framer-motion ВСЕГДА анимирует, даже если
          у пользователя в ОС включён prefers-reduced-motion. Это было
          компромиссом по a11y, но владелец сайта выбрал визуальный приоритет.
          Раньше стояло "user" — framer глушил всё на iPhone, если у юзера
          был Low Power Mode (он автоматически включает reduce-motion).
          Если захочешь вернуть accessibility-strict — поменяй на "user".

          Долгие декоративные циклы (animate-float и т.п.) всё равно глушатся
          через CSS @media (prefers-reduced-motion: reduce) в globals.css, так
          что motion-sickness-провокаторы не работают и при "never".
        */}
        <MotionConfig reducedMotion="never" transition={{ ...TRANSITION.base, ease: EASE_OUT }}>
          <CookieConsentProvider>
            {children}
            <CookieConsentBanner />
            <ConditionalAnalytics />
            <MotionDebugOverlay />
          </CookieConsentProvider>
        </MotionConfig>
      </NextThemesProvider>
    </SessionProvider>
  );
}
