"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  getTitleForLocale,
  getDescriptionForLocale,
  type PriceCatalogStructure,
  type PriceLocale,
  type PriceZone,
  type PriceSection,
  type PriceService,
  type ZonePriceItem,
  type SexKey,
} from "@/types/price-catalog";

function formatPrice(price: number | string): string {
  if (typeof price === "number") return `${price}`;
  return String(price);
}

function ZoneItemsList({
  items,
  locale,
  place,
  localePath,
}: {
  items: ZonePriceItem[];
  locale: PriceLocale;
  place: string;
  localePath: string;
}) {
  const t = useTranslations("price");
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const title = getTitleForLocale(item, locale);
        const desc = getDescriptionForLocale(item, locale);
        const bookingHref = `${localePath}/depilation/booking?service=${encodeURIComponent(title)}&duration=${item.durationMinutes}`;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5 border-b border-white/5 last:border-0"
          >
            <div className="min-w-0">
              <span className="text-icyWhite font-medium">{title}</span>
              {desc ? (
                <p className="text-icyWhite/55 text-sm mt-0.5">{desc}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-icyWhite/70 text-sm">
                {item.durationMinutes} {t("min")}
              </span>
              <span className="text-purple-soft/90 font-medium">
                {formatPrice(item.price)} €
              </span>
              <Link
                href={bookingHref}
                className="text-purple-soft/80 hover:text-purple-soft text-xs uppercase tracking-wider"
              >
                {t("bookThis")}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ZoneBlock({
  zone,
  locale,
  place,
  localePath,
}: {
  zone: PriceZone;
  locale: PriceLocale;
  place: string;
  localePath: string;
}) {
  const title = getTitleForLocale(zone, locale);
  const desc = getDescriptionForLocale(zone, locale);
  if (!zone.items?.length) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-icyWhite mb-1">{title}</h3>
      {desc ? (
        <p className="text-icyWhite/60 text-sm mb-3">{desc}</p>
      ) : null}
      <ZoneItemsList
        items={zone.items}
        locale={locale}
        place={place}
        localePath={localePath}
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
  const desc = getDescriptionForLocale(section, locale);
  const zones = section.zones ?? [];
  if (zones.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-purple-soft/90 mb-2">{title}</h2>
      {desc ? (
        <p className="text-icyWhite/60 text-sm mb-4">{desc}</p>
      ) : null}
      <div className="pl-4 border-l border-white/10 space-y-6">
        {zones.map((zone) => (
          <ZoneBlock
            key={zone.id}
            zone={zone}
            locale={locale}
            place={place}
            localePath={localePath}
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
  const desc = getDescriptionForLocale(service, locale);
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
      {desc ? (
        <p className="text-icyWhite/60 text-sm mb-6">{desc}</p>
      ) : null}
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
          />
        </div>
      )}
    </section>
  );
}

interface PriceCatalogViewProps {
  catalog: PriceCatalogStructure | null;
  place: string;
  sex: SexKey;
}

export default function PriceCatalogView({
  catalog,
  place,
  sex,
}: PriceCatalogViewProps) {
  const locale = useLocale() as PriceLocale;
  const localePath = `/${locale}`;
  const branch = catalog?.[sex];
  const services = branch?.services ?? [];

  if (!catalog) return null;
  if (services.length === 0) return null;

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
