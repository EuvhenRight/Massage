"use client";

import { shouldShowSectionBookLink } from "@/lib/price-catalog-section-book";
import { shouldShowPriceRowBookLink } from "@/lib/price-catalog-show-item-book";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  getTitleForLocale,
  normalizeItemBookingDayCount,
  type PriceCatalogStructure,
  type PriceLocale,
  type PriceSection,
  type PriceService,
  type PriceZone,
  type ZonePriceItem,
  type SexKey,
} from "@/types/price-catalog";

export type PriceCatalogViewSex = SexKey;

function formatPrice(price: number | string): string {
  if (typeof price === "number") return `${price}`;
  return String(price).trim();
}

/** Avoid "— €" or "on request €" for placeholders and phrases. */
function priceShowsEuroSuffix(price: number | string): boolean {
  if (typeof price === "number") return true;
  const s = String(price).trim();
  if (s === "—" || s === "-" || s.length === 0) return false;
  if (/request|vyžiadanie|запит|запросу|договор/i.test(s)) return false;
  return true;
}

type AccentGlass = {
  price: string;
  book: string;
};

function ZoneItemsList({
  items,
  locale,
  place,
  localePath,
  showBookLink,
}: {
  items: ZonePriceItem[];
  locale: PriceLocale;
  place: string;
  localePath: string;
  showBookLink: boolean;
}) {
  const t = useTranslations("price");
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const title = getTitleForLocale(item, locale);
        const isTbdLine =
          item.bookingGranularity === "tbd" || item.bookingGranularity === "day";
        const omitDurationInLink = isTbdLine;
        const bookingPath =
          place === "massage" ? "massage/booking" : "depilation/booking";
        const bookingHref = omitDurationInLink
          ? `${localePath}/${bookingPath}?service=${encodeURIComponent(title)}`
          : `${localePath}/${bookingPath}?service=${encodeURIComponent(title)}&duration=${item.durationMinutes}`;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5 border-b border-white/5 last:border-0"
          >
            <div className="min-w-0">
              <span className="text-icyWhite font-medium">{title}</span>
              {isTbdLine ? (
                <p className="text-icyWhite/50 text-xs mt-0.5">
                  {t("tbdPriceLineDays", {
                    count: normalizeItemBookingDayCount(item.bookingDayCount),
                  })}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!omitDurationInLink && (
                <span className="text-icyWhite/70 text-sm">
                  {item.durationMinutes} {t("min")}
                </span>
              )}
              <span className="text-gold-soft/90 font-medium">
                {formatPrice(item.price)}
                {priceShowsEuroSuffix(item.price) ? " €" : ""}
              </span>
              {showBookLink ? (
                <Link
                  href={bookingHref}
                  className="text-gold-soft/80 hover:text-gold-soft text-xs uppercase tracking-wider"
                >
                  {t("bookThis")}
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ZoneItemsListGlass({
  items,
  locale,
  place,
  localePath,
  accent,
  showBookLink,
}: {
  items: ZonePriceItem[];
  locale: PriceLocale;
  place: string;
  localePath: string;
  accent: AccentGlass;
  showBookLink: boolean;
}) {
  const t = useTranslations("price");
  return (
    <>
      {items.map((item) => {
        const title = getTitleForLocale(item, locale);
        const isTbdLine =
          item.bookingGranularity === "tbd" || item.bookingGranularity === "day";
        const omitDurationInLink = isTbdLine;
        const bookingPath =
          place === "massage" ? "massage/booking" : "depilation/booking";
        const bookingHref = omitDurationInLink
          ? `${localePath}/${bookingPath}?service=${encodeURIComponent(title)}`
          : `${localePath}/${bookingPath}?service=${encodeURIComponent(title)}&duration=${item.durationMinutes}`;
        return (
          <li
            key={item.id}
            className={cn(
              "px-4 py-2.5 sm:px-5 sm:py-3 transition-colors duration-300",
              place === "massage"
                ? "hover:bg-white/[0.02]"
                : "hover:bg-white/[0.03]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-icyWhite font-medium text-sm">{title}</p>
                {isTbdLine ? (
                  <p className="text-icyWhite/50 text-xs mt-1">
                    {t("tbdPriceLineDays", {
                      count: normalizeItemBookingDayCount(item.bookingDayCount),
                    })}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-sm", accent.price)}>
                  {formatPrice(item.price)}
                  {priceShowsEuroSuffix(item.price) ? " €" : ""}
                </p>
                {!omitDurationInLink && (
                  <p className="text-icyWhite/35 text-xs flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3" aria-hidden />
                    {item.durationMinutes} {t("min")}
                  </p>
                )}
              </div>
            </div>
            {showBookLink ? (
              <Link href={bookingHref} className={accent.book}>
                {t("bookThis")}
                <ChevronRight className="w-3 h-3" aria-hidden />
              </Link>
            ) : null}
          </li>
        );
      })}
    </>
  );
}

function ZoneCardGlass({
  zone,
  locale,
  place,
  localePath,
  cardClass,
  accent,
  zoneIndex,
  divideClass,
  showBookLink,
}: {
  zone: PriceZone;
  locale: PriceLocale;
  place: string;
  localePath: string;
  cardClass: string;
  accent: AccentGlass;
  zoneIndex: number;
  divideClass: string;
  showBookLink: boolean;
}) {
  const title = getTitleForLocale(zone, locale);
  const items = zone.items ?? [];
  if (items.length === 0) return null;
  const isMassage = place === "massage";
  const headerClass = isMassage
    ? "px-4 py-2.5 sm:px-5 border-b border-white/10"
    : "px-4 py-2.5 sm:px-5 border-b border-white/[0.06] bg-white/[0.02]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        delay: zoneIndex * 0.12,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cardClass}
    >
      <div className={headerClass}>
        <h3 className="font-serif text-base sm:text-lg text-icyWhite">{title}</h3>
      </div>
      <ul className={divideClass}>
        <ZoneItemsListGlass
          items={items}
          locale={locale}
          place={place}
          localePath={localePath}
          accent={accent}
          showBookLink={showBookLink}
        />
      </ul>
    </motion.div>
  );
}

function ServiceBlockGlass({
  service,
  locale,
  place,
  localePath,
}: {
  service: PriceService;
  locale: PriceLocale;
  place: string;
  localePath: string;
}) {
  const t = useTranslations("price");
  const isMassage = place === "massage";
  const cardClass = isMassage
    ? "rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
    : "rounded-3xl glass-card overflow-hidden group";
  const divideClass = isMassage
    ? "divide-y divide-white/5"
    : "divide-y divide-white/[0.04]";
  const accent: AccentGlass = isMassage
    ? {
        price: "text-gold-glow font-medium",
        book: "inline-flex items-center gap-1 text-gold-glow/70 hover:text-gold-glow text-xs tracking-wider uppercase mt-2.5 transition-colors duration-300",
      }
    : {
        price: "text-gold-soft font-semibold",
        book: "inline-flex items-center gap-1 text-gold-soft/60 hover:text-gold-soft text-xs tracking-wider uppercase mt-2.5 transition-colors duration-300",
      };

  const sections = service.sections ?? [];
  const rootZones = service.zones ?? [];
  const directItems = service.items ?? [];

  return (
    <div className="space-y-6 sm:space-y-7">
      {sections.map((section) => {
        const zones = (section.zones ?? []).filter(
          (z) => (z.items?.length ?? 0) > 0
        );
        if (zones.length === 0) return null;
        const showBookLink = shouldShowPriceRowBookLink(place, section);
        const showSectionBook =
          place === "depilation" && shouldShowSectionBookLink(place, section);
        const sectionTitle = getTitleForLocale(section, locale);
        return (
          <div key={section.id}>
            <h3 className="font-serif text-base sm:text-lg text-icyWhite text-center mb-2 px-2">
              {sectionTitle}
            </h3>
            {showSectionBook ? (
              <div className="flex justify-center mb-3">
                <Link
                  href={`${localePath}/depilation/booking?service=${encodeURIComponent(sectionTitle)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gold-soft/50 bg-gold-soft/15 px-4 py-2 text-xs sm:text-sm font-medium text-gold-soft hover:bg-gold-soft/25 transition-colors"
                >
                  {t("bookThis")}
                </Link>
              </div>
            ) : null}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {zones.map((zone, zi) => (
                <ZoneCardGlass
                  key={zone.id}
                  zone={zone}
                  locale={locale}
                  place={place}
                  localePath={localePath}
                  cardClass={cardClass}
                  accent={accent}
                  zoneIndex={zi}
                  divideClass={divideClass}
                  showBookLink={showBookLink}
                />
              ))}
            </div>
          </div>
        );
      })}

      {rootZones.filter((z) => (z.items?.length ?? 0) > 0).length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {rootZones
            .filter((z) => (z.items?.length ?? 0) > 0)
            .map((zone, zi) => (
              <ZoneCardGlass
                key={zone.id}
                zone={zone}
                locale={locale}
                place={place}
                localePath={localePath}
                cardClass={cardClass}
                accent={accent}
                zoneIndex={zi}
                divideClass={divideClass}
                showBookLink={shouldShowPriceRowBookLink(place, null)}
              />
            ))}
        </div>
      )}

      {directItems.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={cardClass}
          >
            <div
              className={
                isMassage
                  ? "px-4 py-3 sm:px-5 border-b border-white/10"
                  : "px-4 py-3 sm:px-5 border-b border-white/[0.06] bg-white/[0.02]"
              }
            >
              <h3 className="font-serif text-lg sm:text-xl text-icyWhite">
                {getTitleForLocale(service, locale)}
              </h3>
            </div>
            <ul className={divideClass}>
              <ZoneItemsListGlass
                items={directItems}
                locale={locale}
                place={place}
                localePath={localePath}
                accent={accent}
                showBookLink={shouldShowPriceRowBookLink(place, null)}
              />
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ZoneBlock({
  zone,
  locale,
  place,
  localePath,
  showBookLink,
}: {
  zone: PriceZone;
  locale: PriceLocale;
  place: string;
  localePath: string;
  showBookLink: boolean;
}) {
  const title = getTitleForLocale(zone, locale);
  if (!zone.items?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-icyWhite mb-1">{title}</h3>
      <ZoneItemsList
        items={zone.items}
        locale={locale}
        place={place}
        localePath={localePath}
        showBookLink={showBookLink}
      />
    </div>
  );
}

function SectionBlock({
  section,
  locale,
  place,
  localePath,
}: {
  section: PriceSection;
  locale: PriceLocale;
  place: string;
  localePath: string;
}) {
  const title = getTitleForLocale(section, locale);
  const zones = section.zones ?? [];
  const showBookLink = shouldShowPriceRowBookLink(place, section);
  if (zones.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gold-soft/90 mb-2">{title}</h2>
      <div className="pl-4 border-l border-white/10 space-y-6">
        {zones.map((zone) => (
          <ZoneBlock
            key={zone.id}
            zone={zone}
            locale={locale}
            place={place}
            localePath={localePath}
            showBookLink={showBookLink}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceBlock({
  service,
  locale,
  place,
  localePath,
}: {
  service: PriceService;
  locale: PriceLocale;
  place: string;
  localePath: string;
}) {
  const title = getTitleForLocale(service, locale);
  const sections = service.sections ?? [];
  const zones = service.zones ?? [];
  const items = service.items ?? [];

  const hasSections = sections.length > 0;
  const hasZones = zones.length > 0;
  const hasItems = items.length > 0;
  if (!hasSections && !hasZones && !hasItems) return null;

  return (
    <section className="mb-12">
      <h1 className="text-2xl font-serif text-icyWhite mb-2">{title}</h1>
      {hasSections &&
        sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            locale={locale}
            place={place}
            localePath={localePath}
          />
        ))}
      {hasZones && (
        <div className="pl-4 border-l border-white/10">
          {zones.map((zone) => (
            <ZoneBlock
              key={zone.id}
              zone={zone}
              locale={locale}
              place={place}
              localePath={localePath}
              showBookLink={shouldShowPriceRowBookLink(place, null)}
            />
          ))}
        </div>
      )}
      {hasItems && (
        <div className="pl-4 border-l border-white/10 mt-4">
          <ZoneItemsList
            items={items}
            locale={locale}
            place={place}
            localePath={localePath}
            showBookLink={shouldShowPriceRowBookLink(place, null)}
          />
        </div>
      )}
    </section>
  );
}

interface PriceCatalogViewProps {
  catalog: PriceCatalogStructure | null;
  place: string;
  sex: PriceCatalogViewSex;
  /** `glass` matches the Services card grid on depilation / massage landing pages. */
  variant?: "default" | "glass";
}

export default function PriceCatalogView({
  catalog,
  place,
  sex,
  variant = "default",
}: PriceCatalogViewProps) {
  const locale = useLocale() as PriceLocale;
  const localePath = `/${locale}`;

  if (!catalog) return null;

  const branch = catalog[sex];
  const services = branch?.services ?? [];

  if (services.length === 0) return null;

  if (variant === "glass") {
    return (
      <div className="space-y-6 sm:space-y-7">
        {services.map((service) => (
          <ServiceBlockGlass
            key={service.id}
            service={service}
            locale={locale}
            place={place}
            localePath={localePath}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <ServiceBlock
          key={service.id}
          service={service}
          locale={locale}
          place={place}
          localePath={localePath}
        />
      ))}
    </div>
  );
}
