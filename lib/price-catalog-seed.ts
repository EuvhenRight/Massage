import type { PriceCatalogStructure } from "@/types/price-catalog";
import { generatePriceItemId } from "@/types/price-catalog";
import type { Place } from "@/lib/places";
import { SECTION_CALENDAR_COLORS } from "@/lib/section-calendar-colors";
import { buildDepilationPriceCatalogStructure } from "@/lib/depilation-price-catalog-full";

export function getPriceCatalogExample(place: Place): PriceCatalogStructure {
  return place === "massage"
    ? getMassagePriceCatalogExample()
    : getDepilationPriceCatalogExample();
}

/** Example massage price catalog. Admin can load this and edit. */
export function getMassagePriceCatalogExample(): PriceCatalogStructure {
  const relaxationZone = {
    id: generatePriceItemId(),
    calendarColor: SECTION_CALENDAR_COLORS[0]!,
    titleSk: "Relaxačné",
    titleEn: "Relaxation",
    titleRu: "Расслабляющие",
    titleUk: "Розслаблюючі",
    items: [
      { id: generatePriceItemId(), titleSk: "Švédska — Klasická", titleEn: "Swedish — Classic", titleRu: "Шведский — Классический", titleUk: "Шведський — Класичний", durationMinutes: 60, price: 55 },
      { id: generatePriceItemId(), titleSk: "Švédska — Hlboký Tlak", titleEn: "Swedish — Deep Pressure", titleRu: "Шведский — Глубокий Нажим", titleUk: "Шведський — Глибокий Тиск", durationMinutes: 60, price: 65 },
      { id: generatePriceItemId(), titleSk: "Masáž Horúcimi Kameňmi", titleEn: "Hot Stone Massage", titleRu: "Массаж Горячими Камнями", titleUk: "Масаж Гарячими Каменями", durationMinutes: 75, price: 80 },
      { id: generatePriceItemId(), titleSk: "Aromaterapeutická Masáž", titleEn: "Aromatherapy Massage", titleRu: "Ароматерапевтический Массаж", titleUk: "Ароматерапевтичний Масаж", durationMinutes: 60, price: 60 },
    ],
  };

  const therapeuticZone = {
    id: generatePriceItemId(),
    calendarColor: SECTION_CALENDAR_COLORS[1]!,
    titleSk: "Terapeutické",
    titleEn: "Therapeutic",
    titleRu: "Терапевтические",
    titleUk: "Терапевтичні",
    items: [
      { id: generatePriceItemId(), titleSk: "Hlboké Tkanivo — Celé Telo", titleEn: "Deep Tissue — Full Body", titleRu: "Глубокое Тканевое — Всё Тело", titleUk: "Глибоке Тканинне — Усе Тіло", durationMinutes: 60, price: 70 },
      { id: generatePriceItemId(), titleSk: "Športová Masáž", titleEn: "Sports Massage", titleRu: "Спортивный Массаж", titleUk: "Спортивний Масаж", durationMinutes: 60, price: 70 },
      { id: generatePriceItemId(), titleSk: "Chrbát a Krk", titleEn: "Back & Neck Focus", titleRu: "Спина и Шея", titleUk: "Спина та Шия", durationMinutes: 30, price: 35 },
      { id: generatePriceItemId(), titleSk: "Lymfatická Drenáž", titleEn: "Lymphatic Drainage", titleRu: "Лимфодренаж", titleUk: "Лімфодренаж", durationMinutes: 60, price: 60 },
    ],
  };

  const specialtyZone = {
    id: generatePriceItemId(),
    calendarColor: SECTION_CALENDAR_COLORS[2]!,
    titleSk: "Špeciálne",
    titleEn: "Specialty",
    titleRu: "Специальные",
    titleUk: "Спеціальні",
    items: [
      { id: generatePriceItemId(), titleSk: "Thajská Tradičná", titleEn: "Thai Traditional", titleRu: "Тайский Традиционный", titleUk: "Тайський Традиційний", durationMinutes: 90, price: 85 },
      { id: generatePriceItemId(), titleSk: "Masáž Hlavy a Pokožky", titleEn: "Head & Scalp Massage", titleRu: "Массаж Головы", titleUk: "Масаж Голови", durationMinutes: 30, price: 30 },
      { id: generatePriceItemId(), titleSk: "Reflexológia Nôh", titleEn: "Foot Reflexology", titleRu: "Рефлексология Стоп", titleUk: "Рефлексологія Стоп", durationMinutes: 45, price: 40 },
      { id: generatePriceItemId(), titleSk: "Párový Oddych", titleEn: "Couples Retreat", titleRu: "Парный Отдых", titleUk: "Парний Відпочинок", durationMinutes: 75, price: 150 },
    ],
  };

  const massageService = {
    id: generatePriceItemId(),
    titleSk: "Masáž",
    titleEn: "Massage",
    titleRu: "Массаж",
    titleUk: "Масаж",
    zones: [relaxationZone, therapeuticZone, specialtyZone],
  };

  return {
    man: { services: [{ ...massageService, id: generatePriceItemId() }] },
    woman: { services: [massageService] },
  };
}

/** Full depilation price catalog (women / men). Admin can load this and edit. */
export function getDepilationPriceCatalogExample(): PriceCatalogStructure {
  return buildDepilationPriceCatalogStructure();
}
