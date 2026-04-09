"use client";

import { heroEnter, useSiteMotion } from "@/lib/site-motion";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const MAPS_URL = "https://maps.google.com/?q=spa+salon";

export default function FloatingCTA() {
  const t = useTranslations("common");
  const { prefersReducedMotion: reduced } = useSiteMotion();

  return (
    <div className="md:hidden fixed left-6 right-6 z-40 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <motion.a
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        {...heroEnter(reduced, { delay: reduced ? 0 : 0.45 })}
        className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gold-soft/20 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-wider uppercase shadow-glow"
        aria-label={`${t("getDirections")} - V2studio`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {t("getDirections")}
      </motion.a>
    </div>
  );
}
