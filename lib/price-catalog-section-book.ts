import type { PriceSection } from "@/types/price-catalog";

/**
 * Depilation only: show one «Забронировать» under section titles for sugaring, training/courses,
 * wax, cosmetology, piercing, additional, etc. — not for Laser / Electro epilation sections.
 */
export function shouldShowSectionBookLink(
  place: string,
  section: PriceSection
): boolean {
  if (place !== "depilation") return false;
  const blob = [
    section.titleSk,
    section.titleEn,
    section.titleRu,
    section.titleUk,
  ]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();
  if (
    /\blaser\b|лазер|лазерна|electro|електро|электро|elektro|електроепіл/i.test(
      blob
    )
  ) {
    return false;
  }
  return /шугаринг|sugaring|shugar|cukrová|сахарн|сахар|обуч|training|školenie|курс|course|навчання|воск|wax|vosk|voskov|doplnkov|дополн|косметолог|cosmet|пирсинг|piercing|пірсинг|dopln|additional/i.test(
    blob
  );
}
