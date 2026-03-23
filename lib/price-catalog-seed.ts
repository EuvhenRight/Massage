import type { PriceCatalogStructure } from "@/types/price-catalog";
import { generatePriceItemId } from "@/types/price-catalog";
import type { Place } from "@/lib/places";

export function getPriceCatalogExample(place: Place): PriceCatalogStructure {
  return place === "massage"
    ? getMassagePriceCatalogExample()
    : getDepilationPriceCatalogExample();
}

/** Example massage price catalog. Admin can load this and edit. */
export function getMassagePriceCatalogExample(): PriceCatalogStructure {
  const relaxationZone = {
    id: generatePriceItemId(),
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

/** Example depilation price catalog (EN titles). Admin can load this and edit. */
export function getDepilationPriceCatalogExample(): PriceCatalogStructure {
  const faceZone = {
    id: generatePriceItemId(),
    titleSk: "Tváre",
    titleEn: "Face",
    titleRu: "Лицо",
    titleUk: "Обличчя",
    items: [
      { id: generatePriceItemId(), titleSk: "Horná pera", titleEn: "Upper lip", titleRu: "Верхняя губа", titleUk: "Верхня губа", durationMinutes: 10, price: 15 },
      { id: generatePriceItemId(), titleSk: "Brada", titleEn: "Chin", titleRu: "Подбородок", titleUk: "Підборіддя", durationMinutes: 10, price: 15 },
      { id: generatePriceItemId(), titleSk: "Líce", titleEn: "Cheeks", titleRu: "Щёки", titleUk: "Щоки", durationMinutes: 15, price: 20 },
      { id: generatePriceItemId(), titleSk: "Zadná časť krku", titleEn: "Back neck", titleRu: "Задняя часть шеи", titleUk: "Задня частина шиї", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Skroene", titleEn: "Sideburns", titleRu: "Бакенбарды", titleUk: "Вусы", durationMinutes: 10, price: 12 },
      { id: generatePriceItemId(), titleSk: "Medzi obočím", titleEn: "Between eyebrows", titleRu: "Межбровье", titleUk: "Міжброва", durationMinutes: 5, price: 10 },
      { id: generatePriceItemId(), titleSk: "Línia čela", titleEn: "Forehead line", titleRu: "Линия лба", titleUk: "Лінія чола", durationMinutes: 10, price: 12 },
      { id: generatePriceItemId(), titleSk: "Brada", titleEn: "Beard", titleRu: "Борода", titleUk: "Борода", durationMinutes: 30, price: 35 },
      { id: generatePriceItemId(), titleSk: "Celá tvár", titleEn: "Full face", titleRu: "Всё лицо", titleUk: "Повне обличчя", durationMinutes: 45, price: 50 },
    ],
  };

  const handsBodyZone = {
    id: generatePriceItemId(),
    titleSk: "Ruky a telo",
    titleEn: "Hands and body",
    titleRu: "Руки и тело",
    titleUk: "Руки та тіло",
    items: [
      { id: generatePriceItemId(), titleSk: "Ruky celé", titleEn: "Hands completely", titleRu: "Руки полностью", titleUk: "Руки повністю", durationMinutes: 25, price: 30 },
      { id: generatePriceItemId(), titleSk: "Ruky po lakeť + lakeť", titleEn: "Arms to elbow + elbow", titleRu: "Руки до локтя + локоть", titleUk: "Руки до ліктя + лікоть", durationMinutes: 20, price: 25 },
      { id: generatePriceItemId(), titleSk: "Podpazušie", titleEn: "Armpits", titleRu: "Подмышки", titleUk: "Пахви", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Plece", titleEn: "Shoulders", titleRu: "Плечи", titleUk: "Плечі", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Hrbet rúk", titleEn: "Hand brushes", titleRu: "Кисти рук", titleUk: "Кисті рук", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Chrbát", titleEn: "Back", titleRu: "Спина", titleUk: "Спина", durationMinutes: 45, price: 55 },
      { id: generatePriceItemId(), titleSk: "Krstnica", titleEn: "Sacrum", titleRu: "Крестец", titleUk: "Крижі", durationMinutes: 20, price: 25 },
      { id: generatePriceItemId(), titleSk: "Prsia", titleEn: "Breast", titleRu: "Грудь", titleUk: "Груди", durationMinutes: 25, price: 30 },
      { id: generatePriceItemId(), titleSk: "Výstrih", titleEn: "Neckline", titleRu: "Декольте", titleUk: "Декольте", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Línia brucha", titleEn: "Belly line", titleRu: "Линия живота", titleUk: "Лінія живота", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Brucho celé", titleEn: "Abdomen completely", titleRu: "Живот полностью", titleUk: "Живіт повністю", durationMinutes: 25, price: 30 },
      { id: generatePriceItemId(), titleSk: "Okolo bradaviek", titleEn: "Around the nipples", titleRu: "Вокруг сосков", titleUk: "Навколо сосків", durationMinutes: 10, price: 12 },
    ],
  };

  const bikiniZone = {
    id: generatePriceItemId(),
    titleSk: "Bikini",
    titleEn: "Bikini",
    titleRu: "Бикини",
    titleUk: "Бікіні",
    items: [
      { id: generatePriceItemId(), titleSk: "Hlboké bikini", titleEn: "Deep bikini", titleRu: "Глубокое бикини", titleUk: "Глибоке бікіні", durationMinutes: 45, price: 55 },
      { id: generatePriceItemId(), titleSk: "Bikini po línii nohavičiek", titleEn: "Bikini along panty line", titleRu: "Бикини по линии трусов", titleUk: "Бікіні по лінії трусиків", durationMinutes: 30, price: 35 },
      { id: generatePriceItemId(), titleSk: "Medziročná záhyb", titleEn: "Intergluteal fold", titleRu: "Межъягодичная складка", titleUk: "Міжягодична складка", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Zadok", titleEn: "Buttocks", titleRu: "Ягодицы", titleUk: "Сідниці", durationMinutes: 25, price: 30 },
      { id: generatePriceItemId(), titleSk: "Ohanbie", titleEn: "Pubic area", titleRu: "Лобковая зона", titleUk: "Лобкова зона", durationMinutes: 20, price: 25 },
      { id: generatePriceItemId(), titleSk: "Pysky", titleEn: "Labia", titleRu: "Половые губы", titleUk: "Статеві губи", durationMinutes: 15, price: 20 },
    ],
  };

  const legsZone = {
    id: generatePriceItemId(),
    titleSk: "Nohy úplne",
    titleEn: "Legs completely",
    titleRu: "Ноги полностью",
    titleUk: "Ноги повністю",
    items: [
      { id: generatePriceItemId(), titleSk: "Nohy celé", titleEn: "Legs completely", titleRu: "Ноги полностью", titleUk: "Ноги повністю", durationMinutes: 60, price: 70 },
      { id: generatePriceItemId(), titleSk: "Lýtko + koleno", titleEn: "Shin + knee", titleRu: "Голень + колено", titleUk: "Гомілка + коліно", durationMinutes: 30, price: 35 },
      { id: generatePriceItemId(), titleSk: "Lýtka", titleEn: "Shins", titleRu: "Голени", titleUk: "Гомілки", durationMinutes: 25, price: 30 },
      { id: generatePriceItemId(), titleSk: "Kolená", titleEn: "Knees", titleRu: "Колени", titleUk: "Коліна", durationMinutes: 15, price: 18 },
      { id: generatePriceItemId(), titleSk: "Stehná", titleEn: "Thighs", titleRu: "Бёдра", titleUk: "Стегна", durationMinutes: 35, price: 40 },
      { id: generatePriceItemId(), titleSk: "Prsty", titleEn: "Toes", titleRu: "Пальцы ног", titleUk: "Пальці ніг", durationMinutes: 15, price: 18 },
    ],
  };

  const laserSection = {
    id: generatePriceItemId(),
    titleSk: "Laserová epilácia",
    titleEn: "Laser epilation",
    titleRu: "Лазерная эпиляция",
    titleUk: "Лазерна епіляція",
    zones: [faceZone, handsBodyZone, bikiniZone, legsZone],
  };

  const electroSection = {
    id: generatePriceItemId(),
    titleSk: "Elektroepilácia",
    titleEn: "Electroepilation",
    titleRu: "Электроэпиляция",
    titleUk: "Електроепіляція",
    zones: [
      {
        id: generatePriceItemId(),
        titleSk: "Tváre",
        titleEn: "Face",
        titleRu: "Лицо",
        titleUk: "Обличчя",
        items: [
          { id: generatePriceItemId(), titleSk: "Horná pera", titleEn: "Upper lip", titleRu: "Верхняя губа", titleUk: "Верхня губа", durationMinutes: 10, price: 15 },
          { id: generatePriceItemId(), titleSk: "Brada", titleEn: "Chin", titleRu: "Подбородок", titleUk: "Підборіддя", durationMinutes: 10, price: 15 },
          { id: generatePriceItemId(), titleSk: "Líce", titleEn: "Cheeks", titleRu: "Щёки", titleUk: "Щоки", durationMinutes: 15, price: 20 },
        ],
      },
    ],
  };

  const depilationService = {
    id: generatePriceItemId(),
    titleSk: "Depilácia",
    titleEn: "Depilation",
    titleRu: "Депиляция",
    titleUk: "Депіляція",
    sections: [laserSection, electroSection],
  };

  return {
    man: { services: [{ ...depilationService, id: generatePriceItemId() }] },
    woman: { services: [depilationService] },
  };
}
