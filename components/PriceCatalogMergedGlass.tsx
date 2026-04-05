"use client";

import {
  buildPriceBookingHref,
  type PriceBookingPathContext,
} from "@/lib/build-price-booking-link";
import type { Place } from "@/lib/places";
import {
  mergeItemPairs,
  mergeSectionPairs,
  mergeServicePairs,
  mergeZonePairs,
} from "@/lib/merge-price-catalog-dual";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  isPriceSaleActive,
  isPriceUnsetForDisplay,
} from "@/lib/price-catalog-price-display";
import {
  getTitleForLocale,
  normalizeItemBookingDayCount,
  type PriceCatalogStructure,
  type PriceLocale,
  type PriceSection,
  type PriceService,
  type PriceZone,
  type ZonePriceItem,
} from "@/types/price-catalog";

function formatPrice(price: number | string): string {
  if (typeof price === "number") return `${price}`;
  return String(price).trim();
}

function priceShowsEuroSuffix(price: number | string): boolean {
  if (typeof price === "number") return true;
  const s = String(price).trim();
  if (s === "—" || s === "-" || s.length === 0) return false;
  if (/request|vyžiadanie|запит|запросу|договор/i.test(s)) return false;
  return true;
}

type AccentGlass = {
  price: string;
};

function isTbdItem(item?: ZonePriceItem): boolean {
  return (
    item?.bookingGranularity === "tbd" || item?.bookingGranularity === "day"
  );
}

function PublicPriceCellInner({
  item,
  accentPriceClass,
  saleBadge,
  reduceMotion,
}: {
  item: ZonePriceItem;
  accentPriceClass: string;
  saleBadge: string;
  reduceMotion: boolean | null;
}) {
  const saleOk = isPriceSaleActive(item);
  const listShown = !isPriceUnsetForDisplay(item.price);

  if (!saleOk && isPriceUnsetForDisplay(item.price)) {
    return <span className="text-icyWhite/30">—</span>;
  }

  if (saleOk) {
    return (
      <span className="inline-flex flex-col items-end gap-1 min-w-0 max-w-full">
        {listShown && (
          <span className="line-through decoration-icyWhite/35 text-icyWhite/45 text-[11px] sm:text-[12px] tabular-nums leading-none">
            {formatPrice(item.price)}
            {priceShowsEuroSuffix(item.price) ? " €" : ""}
          </span>
        )}
        <span className="inline-flex flex-row flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
          <motion.span
            className="shrink-0 text-[10px] sm:text-[11px] font-extrabold tracking-[0.14em] uppercase leading-none text-red-400"
            aria-hidden
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0.82, 1, 0.82],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {saleBadge}
          </motion.span>
          <motion.span
            className="tabular-nums text-lg sm:text-xl font-bold leading-none text-red-500 drop-shadow-[0_0_18px_rgba(248,113,113,0.55)]"
            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 22, mass: 0.7 }
            }
          >
            {formatPrice(item.salePrice!)}
            {priceShowsEuroSuffix(item.salePrice!) ? " €" : ""}
          </motion.span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("tabular-nums", accentPriceClass)}>
      {formatPrice(item.price)}
      {priceShowsEuroSuffix(item.price) ? " €" : ""}
    </span>
  );
}

/** Aligned columns: service · min · woman € · man €; prices link to booking with preset line + sex. */
function ZoneItemsListGlassDual({
  rows,
  locale,
  place,
  localePath,
  accent,
  bookingPathCtx,
}: {
  rows: { w?: ZonePriceItem; m?: ZonePriceItem }[];
  locale: PriceLocale;
  place: Place;
  localePath: string;
  accent: AccentGlass;
  bookingPathCtx: PriceBookingPathContext;
}) {
  const t = useTranslations("price");
  const reduceMotion = useReducedMotion();

  return (
    <>
      {rows.map((row) => {
        const primary = row.w ?? row.m;
        if (!primary) return null;
        const title = getTitleForLocale(primary, locale);
        const wTbd = isTbdItem(row.w);
        const mTbd = isTbdItem(row.m);
        const showDuration =
          !wTbd &&
          !mTbd &&
          (row.w?.durationMinutes != null || row.m?.durationMinutes != null);
        const dw = row.w?.durationMinutes;
        const dm = row.m?.durationMinutes;
        const durationLabel =
          dw != null && dm != null && dw !== dm
            ? `${dw}·${dm}`
            : dw != null
              ? `${dw}`
              : dm != null
                ? `${dm}`
                : null;

        const hrefW = row.w
          ? buildPriceBookingHref(
              locale,
              localePath,
              place,
              row.w,
              "woman",
              bookingPathCtx
            )
          : null;
        const hrefM = row.m
          ? buildPriceBookingHref(
              locale,
              localePath,
              place,
              row.m,
              "man",
              bookingPathCtx
            )
          : null;

        const priceCell = (
          item: ZonePriceItem | undefined,
          href: string | null
        ) => {
          const showSale = item ? isPriceSaleActive(item) : false;
          const inner =
            !item ? (
              <span className="text-icyWhite/30">–</span>
            ) : (
              <PublicPriceCellInner
                item={item}
                accentPriceClass={accent.price}
                saleBadge={t("saleBadge")}
                reduceMotion={reduceMotion}
              />
            );
          if (item && href) {
            return (
              <Link
                href={href}
                className={cn(
                  "text-[13px] leading-none inline-flex justify-end min-w-0",
                  !showSale && accent.price,
                  showSale && "text-icyWhite/95",
                  "hover:underline underline-offset-2 decoration-white/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-sm"
                )}
              >
                {inner}
              </Link>
            );
          }
          return (
            <span
              className={cn(
                "text-[13px] leading-none inline-flex justify-end min-w-0",
                !showSale && accent.price,
                showSale && "text-icyWhite/95"
              )}
            >
              {inner}
            </span>
          );
        };

        return (
          <li
            key={row.w?.id ?? row.m?.id ?? primary.titleSk}
            className={cn(
              "transition-colors",
              place === "massage"
                ? "hover:bg-white/[0.02]"
                : "hover:bg-white/[0.025]"
            )}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_2.25rem_5.25rem_5.25rem] gap-x-1.5 sm:gap-x-2 items-baseline px-2 py-1 sm:px-2.5 sm:py-1.5">
              <div className="min-w-0">
                <p className="text-icyWhite text-xs font-medium leading-snug">
                  {title}
                </p>
                {(wTbd || mTbd) && (
                  <p className="text-icyWhite/45 text-[10px] leading-tight mt-0.5">
                    {t("tbdPriceLineDays", {
                      count: normalizeItemBookingDayCount(
                        row.w?.bookingDayCount ?? row.m?.bookingDayCount
                      ),
                    })}
                  </p>
                )}
              </div>
              <div className="text-right text-[10px] text-icyWhite/40 tabular-nums leading-none">
                {showDuration && durationLabel ? (
                  <span className="inline-flex items-center justify-end gap-0.5">
                    <Clock className="w-2.5 h-2.5 opacity-60 shrink-0" aria-hidden />
                    {durationLabel}
                  </span>
                ) : null}
              </div>
              <div className="text-right">{priceCell(row.w, hrefW)}</div>
              <div className="text-right">{priceCell(row.m, hrefM)}</div>
            </div>
          </li>
        );
      })}
    </>
  );
}

function ZoneCardGlassDual({
  zonePair,
  servicePair,
  sectionPair,
  pathMode,
  locale,
  place,
  localePath,
  cardClass,
  accent,
  zoneIndex,
  divideClass,
}: {
  zonePair: { w?: PriceZone; m?: PriceZone };
  servicePair: { w?: PriceService; m?: PriceService };
  sectionPair?: { w?: PriceSection; m?: PriceSection };
  pathMode: "section" | "rootZone";
  locale: PriceLocale;
  place: Place;
  localePath: string;
  cardClass: string;
  accent: AccentGlass;
  zoneIndex: number;
  divideClass: string;
}) {
  const t = useTranslations("price");
  const zone = zonePair.w ?? zonePair.m;
  if (!zone) return null;
  const title = getTitleForLocale(zone, locale);
  const rows = mergeItemPairs(zonePair.w?.items, zonePair.m?.items);
  if (rows.length === 0) return null;
  const bookingPathCtx: PriceBookingPathContext = {
    sw: servicePair.w,
    sm: servicePair.m,
    sectionW: sectionPair?.w,
    sectionM: sectionPair?.m,
    zoneW: zonePair.w,
    zoneM: zonePair.m,
    pathMode,
  };
  const isMassage = place === "massage";
  const headerClass = isMassage
    ? "border-b border-white/10"
    : "border-b border-white/[0.06] bg-white/[0.02]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        delay: zoneIndex * 0.04,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cardClass}
    >
      <div
        className={cn(
          headerClass,
          "grid grid-cols-[minmax(0,1fr)_2.25rem_5.25rem_5.25rem] gap-x-1.5 sm:gap-x-2 items-baseline px-2 py-1.5 sm:px-2.5"
        )}
      >
        <h3 className="font-serif text-sm text-icyWhite leading-tight min-w-0">
          {title}
        </h3>
        <span className="text-[9px] text-icyWhite/35 text-right tabular-nums leading-none">
          {t("min")}
        </span>
        <span className="text-[9px] uppercase tracking-wide text-icyWhite/45 text-right leading-none">
          {t("woman")}
        </span>
        <span className="text-[9px] uppercase tracking-wide text-icyWhite/45 text-right leading-none">
          {t("man")}
        </span>
      </div>
      <ul className={divideClass}>
        <ZoneItemsListGlassDual
          rows={rows}
          locale={locale}
          place={place}
          localePath={localePath}
          accent={accent}
          bookingPathCtx={bookingPathCtx}
        />
      </ul>
    </motion.div>
  );
}

function ServiceBlockGlassDual({
  servicePair,
  locale,
  place,
  localePath,
}: {
  servicePair: { w?: PriceService; m?: PriceService };
  locale: PriceLocale;
  place: Place;
  localePath: string;
}) {
  const t = useTranslations("price");
  const isMassage = place === "massage";
  const cardClass = isMassage
    ? "rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
    : "rounded-2xl glass-card overflow-hidden group";
  const divideClass = isMassage
    ? "divide-y divide-white/5"
    : "divide-y divide-white/[0.04]";
  const accent: AccentGlass = isMassage
    ? {
        price: "text-purple-glow font-medium",
      }
    : {
        price: "text-gold-soft font-semibold",
      };

  const sw = servicePair.w;
  const sm = servicePair.m;
  const sectionsW = sw?.sections ?? [];
  const sectionsM = sm?.sections ?? [];
  const mergedSections = mergeSectionPairs(sectionsW, sectionsM);

  const rootZonesW = sw?.zones ?? [];
  const rootZonesM = sm?.zones ?? [];
  const mergedRootZones = mergeZonePairs(rootZonesW, rootZonesM);

  const directW = sw?.items ?? [];
  const directM = sm?.items ?? [];
  const mergedDirectItems = mergeItemPairs(directW, directM);

  return (
    <div className="space-y-3 sm:space-y-4">
      {mergedSections.map((pair) => {
        const section = pair.w ?? pair.m;
        if (!section) return null;
        const zonesW = pair.w?.zones ?? [];
        const zonesM = pair.m?.zones ?? [];
        const mergedZones = mergeZonePairs(zonesW, zonesM);
        if (mergedZones.length === 0) return null;
        const sectionTitle = getTitleForLocale(section, locale);
        return (
          <div key={section.id}>
            <h3 className="font-serif text-sm sm:text-base text-icyWhite text-center mb-1 px-1 leading-tight">
              {sectionTitle}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {mergedZones.map((zp, zi) => (
                <ZoneCardGlassDual
                  key={zp.w?.id ?? zp.m?.id ?? `z-${zi}`}
                  zonePair={zp}
                  servicePair={{ w: sw, m: sm }}
                  sectionPair={{ w: pair.w, m: pair.m }}
                  pathMode="section"
                  locale={locale}
                  place={place}
                  localePath={localePath}
                  cardClass={cardClass}
                  accent={accent}
                  zoneIndex={zi}
                  divideClass={divideClass}
                />
              ))}
            </div>
          </div>
        );
      })}

      {mergedRootZones.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          {mergedRootZones.map((zp, zi) => (
            <ZoneCardGlassDual
              key={zp.w?.id ?? zp.m?.id ?? `rz-${zi}`}
              zonePair={zp}
              servicePair={{ w: sw, m: sm }}
              pathMode="rootZone"
              locale={locale}
              place={place}
              localePath={localePath}
              cardClass={cardClass}
              accent={accent}
              zoneIndex={zi}
              divideClass={divideClass}
            />
          ))}
        </div>
      )}

      {mergedDirectItems.length > 0 && (sw ?? sm) && (
        <div className="max-w-3xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={cardClass}
          >
            <div
              className={cn(
                isMassage
                  ? "border-b border-white/10"
                  : "border-b border-white/[0.06] bg-white/[0.02]",
                "grid grid-cols-[minmax(0,1fr)_2.25rem_5.25rem_5.25rem] gap-x-1.5 sm:gap-x-2 items-baseline px-2 py-1.5 sm:px-2.5"
              )}
            >
              <h3 className="font-serif text-sm text-icyWhite leading-tight min-w-0">
                {getTitleForLocale(sw ?? sm!, locale)}
              </h3>
              <span className="text-[9px] text-icyWhite/35 text-right tabular-nums leading-none">
                {t("min")}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-icyWhite/45 text-right leading-none">
                {t("woman")}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-icyWhite/45 text-right leading-none">
                {t("man")}
              </span>
            </div>
            <ul className={divideClass}>
              <ZoneItemsListGlassDual
                rows={mergedDirectItems}
                locale={locale}
                place={place}
                localePath={localePath}
                accent={accent}
                bookingPathCtx={{
                  sw,
                  sm,
                  pathMode: "directItems",
                }}
              />
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  );
}

type PriceCatalogMergedGlassProps = {
  catalog: PriceCatalogStructure | null;
  place: Place;
};

/**
 * One glass price list: each row shows **woman** and **man** prices side by side (blank `-` when missing).
 */
export default function PriceCatalogMergedGlass({
  catalog,
  place,
}: PriceCatalogMergedGlassProps) {
  const locale = useLocale() as PriceLocale;
  const localePath = `/${locale}`;

  if (!catalog) return null;

  const merged = mergeServicePairs(
    catalog.woman.services,
    catalog.man.services
  );
  if (merged.length === 0) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {merged.map((pair) => (
        <ServiceBlockGlassDual
          key={pair.w?.id ?? pair.m?.id ?? "svc"}
          servicePair={pair}
          locale={locale}
          place={place}
          localePath={localePath}
        />
      ))}
    </div>
  );
}
