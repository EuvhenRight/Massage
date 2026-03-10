"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";

type NavLink = { path: string; key: string };

const MASSAGE_LINKS: NavLink[] = [
  { path: "/massage#services", key: "services" },
  { path: "/massage#membership", key: "membership" },
  { path: "/massage/booking", key: "book" },
];

const DEPILATION_LINKS: NavLink[] = [
  { path: "/depilation#services", key: "services" },
  { path: "/depilation#membership", key: "membership" },
  { path: "/depilation/booking", key: "book" },
];

export default function Navbar() {
  const t = useTranslations("common");
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) ?? "sk";
  const isDepilation = pathname?.includes("/depilation") ?? false;

  const navLinks = useMemo(() => {
    const links = isDepilation ? DEPILATION_LINKS : MASSAGE_LINKS;
    return links.map(({ path, key }) => ({
      href: `/${locale}${path}`,
      label: t(key),
    }));
  }, [locale, isDepilation, t]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? "rgba(10, 10, 10, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "blur(0px)",
      }}
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8"
        aria-label={t("mainNav")}
      >
        <Link
          href={`/${locale}`}
          className="font-serif text-xl text-icyWhite hover:text-gold-soft transition-colors duration-300"
          aria-label={t("auroraHome")}
        >
          {t("aurora")}
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
        <ul className="flex items-center gap-10">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm tracking-[0.15em] uppercase text-icyWhite/80 hover:text-gold-soft transition-colors duration-300"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <LanguageSwitcher variant="site" className="ml-2" />
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 text-icyWhite"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      <motion.div
        id="mobile-menu"
        initial={false}
        animate={{
          height: mobileOpen ? "auto" : 0,
          opacity: mobileOpen ? 1 : 0,
        }}
        className="md:hidden overflow-hidden border-t border-white/5"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 pb-4 mb-2">
          <span className="text-xs text-icyWhite/50 uppercase tracking-wider">Language</span>
          <LanguageSwitcher variant="site" />
        </div>
        <ul className="px-6 py-4 space-y-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm tracking-[0.15em] uppercase text-icyWhite/80 hover:text-gold-soft transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.header>
  );
}
