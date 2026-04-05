import type {
	PriceCatalogStructure,
	PriceSection,
	PriceService,
	PriceZone,
	ZonePriceItem,
} from "@/types/price-catalog";
import { generatePriceItemId } from "@/types/price-catalog";
import { SECTION_CALENDAR_COLORS } from "@/lib/section-calendar-colors";

type T4 = { sk: string; en: string; ru: string; uk: string };

function line(
	t: T4,
	price: number | string,
	durationMinutes: number,
): ZonePriceItem {
	return {
		id: generatePriceItemId(),
		titleSk: t.sk,
		titleEn: t.en,
		titleRu: t.ru,
		titleUk: t.uk,
		price,
		durationMinutes,
	};
}

/** Price arranged individually (whitening, wraps, training). */
function lineTbd(t: T4): ZonePriceItem {
	return {
		id: generatePriceItemId(),
		titleSk: t.sk,
		titleEn: t.en,
		titleRu: t.ru,
		titleUk: t.uk,
		price: "—",
		durationMinutes: 60,
		bookingGranularity: "tbd",
		scheduleTbdMessageSk: "Termín a cenu dohodneme individuálne.",
		scheduleTbdMessageEn: "We will arrange timing and price with you individually.",
		scheduleTbdMessageRu: "Дата и цена согласуются индивидуально.",
		scheduleTbdMessageUk: "Дату та ціну узгодимо індивідуально.",
	};
}

function makeZone(t: T4, items: ZonePriceItem[]): PriceZone {
	return {
		id: generatePriceItemId(),
		titleSk: t.sk,
		titleEn: t.en,
		titleRu: t.ru,
		titleUk: t.uk,
		items,
	};
}

function makeSection(
	color: string,
	t: T4,
	zones: PriceZone[],
): PriceSection {
	return {
		id: generatePriceItemId(),
		calendarColor: color,
		titleSk: t.sk,
		titleEn: t.en,
		titleRu: t.ru,
		titleUk: t.uk,
		zones,
	};
}

function makeService(t: T4, sections: PriceSection[]): PriceService {
	return {
		id: generatePriceItemId(),
		titleSk: t.sk,
		titleEn: t.en,
		titleRu: t.ru,
		titleUk: t.uk,
		sections,
	};
}

const DEPILATION: T4 = {
	sk: "Depilácia",
	en: "Depilation",
	ru: "Депиляция",
	uk: "Депіляція",
};

const LASER: T4 = {
	sk: "Laserová epilácia",
	en: "Laser epilation",
	ru: "Лазерная эпиляция",
	uk: "Лазерна епіляція",
};

const WAX: T4 = {
	sk: "Vosková depilácia",
	en: "Wax depilation",
	ru: "Восковая депиляция",
	uk: "Воскова депіляція",
};

const SUGAR: T4 = {
	sk: "Cukrová depilácia (shugaring)",
	en: "Sugaring",
	ru: "Шугаринг",
	uk: "Шугаринг",
};

const COSMETOLOGY: T4 = {
	sk: "Kozmetológia",
	en: "Cosmetology",
	ru: "Косметология",
	uk: "Косметологія",
};

const ADDITIONAL: T4 = {
	sk: "Doplnkové služby",
	en: "Additional",
	ru: "Дополнительно",
	uk: "Додатково",
};

/** Own block on the public price list (merged woman/man column). */
const COURSES_AND_TRAINING: T4 = {
	sk: "Kurzy a školenia",
	en: "Courses & training",
	ru: "Курсы и обучение",
	uk: "Курси та навчання",
};

const COURSES_ZONE: T4 = {
	sk: "Kurzy",
	en: "Courses",
	ru: "Курсы",
	uk: "Курси",
};

const PIERCING: T4 = {
	sk: "Piercing",
	en: "Piercing",
	ru: "Пирсинг",
	uk: "Пірсинг",
};

const FACE: T4 = {
	sk: "Tvár",
	en: "Face",
	ru: "Лицо",
	uk: "Обличчя",
};

const HANDS_BODY: T4 = {
	sk: "Ruky a telo",
	en: "Arms and body",
	ru: "Руки и тело",
	uk: "Руки та тіло",
};

const BIKINI: T4 = {
	sk: "Bikini",
	en: "Bikini",
	ru: "Бикини",
	uk: "Бікіні",
};

const LEGS: T4 = {
	sk: "Nohy",
	en: "Legs",
	ru: "Ноги",
	uk: "Ноги",
};

const WAX_COMPLEXES: T4 = {
	sk: "Komplexy",
	en: "Packages",
	ru: "Комплексы",
	uk: "Комплекси",
};

const SUGAR_COMPLEXES: T4 = {
	sk: "Komplexy",
	en: "Packages",
	ru: "Комплексы",
	uk: "Комплекси",
};

function womanLaserSection(): PriceSection {
	const face = makeZone(FACE, [
		line(
			{
				sk: "Horná pera",
				en: "Upper lip",
				ru: "Верхняя губа",
				uk: "Верхня губа",
			},
			20,
			10,
		),
		line(
			{
				sk: "Brada",
				en: "Chin",
				ru: "Подбородок",
				uk: "Підборіддя",
			},
			20,
			10,
		),
		line(
			{ sk: "Líca", en: "Cheeks", ru: "Щёки", uk: "Щоки" },
			30,
			15,
		),
		line(
			{ sk: "Krk", en: "Neck", ru: "Шея", uk: "Шия" },
			30,
			15,
		),
		line(
			{
				sk: "Bočné fúzy",
				en: "Sideburns",
				ru: "Бакенбарды",
				uk: "Бакенбарди",
			},
			30,
			15,
		),
		line(
			{
				sk: "Medzi obočím",
				en: "Between eyebrows",
				ru: "Межбровка",
				uk: "Міжбров’я",
			},
			15,
			5,
		),
		line(
			{
				sk: "Línia čela",
				en: "Forehead line",
				ru: "Линия лба",
				uk: "Лінія чола",
			},
			15,
			10,
		),
		line(
			{
				sk: "Oblasť brady (fúzy)",
				en: "Beard area",
				ru: "Борода",
				uk: "Борода",
			},
			25,
			30,
		),
		line(
			{
				sk: "Celá tvár",
				en: "Full face",
				ru: "Лицо полностью",
				uk: "Обличчя повністю",
			},
			50,
			45,
		),
	]);

	const handsBody = makeZone(HANDS_BODY, [
		line(
			{
				sk: "Ruky celé",
				en: "Full arms",
				ru: "Руки полностью",
				uk: "Руки повністю",
			},
			65,
			25,
		),
		line(
			{
				sk: "Ruky po lakeť (+ lakeť)",
				en: "Arms to elbow (+ elbow)",
				ru: "Руки до локтя (+ локоть)",
				uk: "Руки до ліктя (+ лікоть)",
			},
			"40–50",
			20,
		),
		line(
			{
				sk: "Podpazušie",
				en: "Underarms",
				ru: "Подмышки",
				uk: "Пахви",
			},
			30,
			15,
		),
		line(
			{ sk: "Plecia", en: "Shoulders", ru: "Плечи", uk: "Плечі" },
			50,
			15,
		),
		line(
			{
				sk: "Hrbet rúk",
				en: "Hands",
				ru: "Кисти рук",
				uk: "Кисті рук",
			},
			20,
			15,
		),
		line(
			{ sk: "Chrbát", en: "Back", ru: "Спина", uk: "Спина" },
			110,
			45,
		),
		line(
			{
				sk: "Krížová kosť",
				en: "Sacrum",
				ru: "Крестец",
				uk: "Крижі",
			},
			40,
			20,
		),
		line(
			{ sk: "Hruď", en: "Chest", ru: "Грудь", uk: "Груди" },
			65,
			25,
		),
		line(
			{
				sk: "Dekolt",
				en: "Décolleté",
				ru: "Декольте",
				uk: "Декольте",
			},
			40,
			15,
		),
		line(
			{
				sk: "Línia brucha",
				en: "Abdominal line",
				ru: "Линия живота",
				uk: "Лінія живота",
			},
			25,
			15,
		),
		line(
			{
				sk: "Brucho celé",
				en: "Full abdomen",
				ru: "Живот полностью",
				uk: "Живіт повністю",
			},
			150,
			35,
		),
		line(
			{
				sk: "Okolo bradaviek",
				en: "Around the nipples",
				ru: "Вокруг сосков",
				uk: "Навколо сосків",
			},
			25,
			10,
		),
	]);

	const bikini = makeZone(BIKINI, [
		line(
			{
				sk: "Hlboké bikini",
				en: "Deep bikini",
				ru: "Глубокое бикини",
				uk: "Глибоке бікіні",
			},
			75,
			45,
		),
		line(
			{
				sk: "Klasické bikini",
				en: "Classic bikini",
				ru: "Бикини классическое",
				uk: "Класичне бікіні",
			},
			50,
			30,
		),
		line(
			{
				sk: "Medzihýžďová ryha",
				en: "Intergluteal fold",
				ru: "Межъягодичная складка",
				uk: "Міжягодична складка",
			},
			25,
			15,
		),
		line(
			{
				sk: "Zadok",
				en: "Buttocks",
				ru: "Ягодицы",
				uk: "Сідниці",
			},
			45,
			25,
		),
		line(
			{
				sk: "Oblasť ochlpenia",
				en: "Pubic area",
				ru: "Зона лобка",
				uk: "Лобкова зона",
			},
			25,
			20,
		),
		line(
			{
				sk: "Pysky",
				en: "Labia",
				ru: "Половые губы",
				uk: "Статеві губи",
			},
			25,
			15,
		),
	]);

	const legs = makeZone(LEGS, [
		line(
			{
				sk: "Nohy celé",
				en: "Full legs",
				ru: "Ноги полностью",
				uk: "Ноги повністю",
			},
			120,
			60,
		),
		line(
			{
				sk: "Lýtka + koleno",
				en: "Calves + knees",
				ru: "Голени + колено",
				uk: "Гомілки + коліно",
			},
			70,
			30,
		),
		line(
			{
				sk: "Lýtka",
				en: "Calves",
				ru: "Голени",
				uk: "Гомілки",
			},
			55,
			25,
		),
		line(
			{
				sk: "Kolená",
				en: "Knees",
				ru: "Колени",
				uk: "Коліна",
			},
			20,
			15,
		),
		line(
			{
				sk: "Stehná",
				en: "Thighs",
				ru: "Бёдра",
				uk: "Стегна",
			},
			70,
			35,
		),
		line(
			{
				sk: "Prsty na nohách",
				en: "Toes",
				ru: "Пальцы",
				uk: "Пальці",
			},
			15,
			10,
		),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[0]!, LASER, [
		face,
		handsBody,
		bikini,
		legs,
	]);
}

function womanWaxSection(): PriceSection {
	const singles = makeZone(
		{
			sk: "Jednotlivé zóny",
			en: "Single areas",
			ru: "Зоны",
			uk: "Зони",
		},
		[
			line(
				{
					sk: "Hlboké bikini",
					en: "Deep bikini",
					ru: "Глубокое бикини",
					uk: "Глибоке бікіні",
				},
				40,
				40,
			),
			line(
				{
					sk: "Klasické bikini",
					en: "Classic bikini",
					ru: "Бикини классика",
					uk: "Класичне бікіні",
				},
				20,
				20,
			),
			line(
				{
					sk: "Ruky po lakeť",
					en: "Arms to elbow",
					ru: "Руки до локтя",
					uk: "Руки до ліктя",
				},
				20,
				20,
			),
			line(
				{
					sk: "Lýtka",
					en: "Calves",
					ru: "Голени",
					uk: "Гомілки",
				},
				25,
				30,
			),
		],
	);

	const complexes = makeZone(WAX_COMPLEXES, [
		line(
			{
				sk: "Mini (½ nôh + bikini + podpazušie)",
				en: "Mini (½ legs + bikini + underarms)",
				ru: "Мини (½ ног + бикини + подмышки)",
				uk: "Міні (½ ніг + бікіні + пахви)",
			},
			60,
			75,
		),
		line(
			{
				sk: "Ruky celé + podpazušie + bikini",
				en: "Full arms + underarms + bikini",
				ru: "Руки полностью + подмышки + бикини",
				uk: "Руки повністю + пахви + бікіні",
			},
			60,
			75,
		),
		line(
			{
				sk: "Super (celé telo)",
				en: "Super (full body)",
				ru: "Супер (всё тело)",
				uk: "Супер (усе тіло)",
			},
			85,
			120,
		),
		line(
			{
				sk: "Nohy celé + bikini + podpazušie",
				en: "Full legs + bikini + underarms",
				ru: "Ноги полностью + бикини + подмышки",
				uk: "Ноги повністю + бікіні + пахви",
			},
			75,
			90,
		),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[1]!, WAX, [singles, complexes]);
}

function womanSugarSection(): PriceSection {
	const singles = makeZone(
		{
			sk: "Jednotlivé zóny",
			en: "Single areas",
			ru: "Зоны",
			uk: "Зони",
		},
		[
			line(
				{
					sk: "Podpazušie",
					en: "Underarms",
					ru: "Подмышки",
					uk: "Пахви",
				},
				10,
				15,
			),
			line(
				{
					sk: "Horná pera",
					en: "Upper lip",
					ru: "Верхняя губа",
					uk: "Верхня губа",
				},
				10,
				10,
			),
			line(
				{
					sk: "Ruky celé",
					en: "Full arms",
					ru: "Руки полностью",
					uk: "Руки повністю",
				},
				25,
				30,
			),
			line(
				{
					sk: "Nohy celé",
					en: "Full legs",
					ru: "Ноги полностью",
					uk: "Ноги повністю",
				},
				35,
				45,
			),
		],
	);

	const complexes = makeZone(SUGAR_COMPLEXES, [
		line(
			{
				sk: "Sviežosť (bikini + podpazušie)",
				en: "Freshness (bikini + underarms)",
				ru: "Свежесть (бикини + подмышки)",
				uk: "Свіжість (бікіні + пахви)",
			},
			45,
			50,
		),
		line(
			{
				sk: "Tvár",
				en: "Face",
				ru: "Лицо",
				uk: "Обличчя",
			},
			25,
			35,
		),
		line(
			{
				sk: "Ruky + nohy celé",
				en: "Full arms + full legs",
				ru: "Руки + ноги полностью",
				uk: "Руки + ноги повністю",
			},
			60,
			90,
		),
		line(
			{
				sk: "Nohy + podpazušie",
				en: "Legs + underarms",
				ru: "Ноги + подмышки",
				uk: "Ноги + пахви",
			},
			45,
			55,
		),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[2]!, SUGAR, [singles, complexes]);
}

function womanCosmetologySection(): PriceSection {
	const z = makeZone(
		{
			sk: "Procedúry",
			en: "Treatments",
			ru: "Процедуры",
			uk: "Процедури",
		},
		[
			line(
				{
					sk: "Mechanické čistenie tváre",
					en: "Manual facial cleansing",
					ru: "Механическая чистка лица",
					uk: "Механічна чистка обличчя",
				},
				55,
				60,
			),
			line(
				{
					sk: "Čistenie bikini",
					en: "Bikini cleansing",
					ru: "Чистка бикини",
					uk: "Чистка бікіні",
				},
				"30–55",
				45,
			),
			line(
				{
					sk: "Masáž tváre",
					en: "Facial massage",
					ru: "Массаж лица",
					uk: "Масаж обличчя",
				},
				"from 30",
				30,
			),
			line(
				{
					sk: "Chemický peeling",
					en: "Chemical peel",
					ru: "Химический пилинг",
					uk: "Хімічний пілінг",
				},
				30,
				45,
			),
			line(
				{
					sk: "Starostlivosť podľa typu pokožky",
					en: "Care by skin type",
					ru: "Уход по типу кожи",
					uk: "Догляд за типом шкіри",
				},
				55,
				60,
			),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[3]!, COSMETOLOGY, [z]);
}

function womanCoursesSection(): PriceSection {
	const z = makeZone(COURSES_ZONE, [
		lineTbd({
			sk: "Školenie voskovacej depilácie",
			en: "Waxing training courses",
			ru: "Курсы восковой депиляции",
			uk: "Курси воскової депіляції",
		}),
		lineTbd({
			sk: "Ďalšie odborné kurzy",
			en: "Other professional courses",
			ru: "Другие профессиональные курсы",
			uk: "Інші професійні курси",
		}),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[6]!, COURSES_AND_TRAINING, [z]);
}

function womanAdditionalSection(): PriceSection {
	const z = makeZone(
		{
			sk: "Služby",
			en: "Services",
			ru: "Услуги",
			uk: "Послуги",
		},
		[
			lineTbd({
				sk: "Intímne bielenie",
				en: "Intimate whitening",
				ru: "Интимное отбеливание",
				uk: "Інтимне відбілювання",
			}),
			lineTbd({
				sk: "Zábaly",
				en: "Body wraps",
				ru: "Обёртывания",
				uk: "Обгортання",
			}),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[4]!, ADDITIONAL, [z]);
}

function manLaserSection(): PriceSection {
	const face = makeZone(FACE, [
		line(
			{
				sk: "Horná pera",
				en: "Upper lip",
				ru: "Верхняя губа",
				uk: "Верхня губа",
			},
			25,
			10,
		),
		line(
			{
				sk: "Brada",
				en: "Chin",
				ru: "Подбородок",
				uk: "Підборіддя",
			},
			25,
			10,
		),
		line(
			{ sk: "Líca", en: "Cheeks", ru: "Щёки", uk: "Щоки" },
			40,
			15,
		),
		line(
			{ sk: "Krk", en: "Neck", ru: "Шея", uk: "Шия" },
			40,
			15,
		),
		line(
			{
				sk: "Bočné fúzy",
				en: "Sideburns",
				ru: "Бакенбарды",
				uk: "Бакенбарди",
			},
			30,
			15,
		),
		line(
			{
				sk: "Medzi obočím",
				en: "Between eyebrows",
				ru: "Межбровка",
				uk: "Міжбров’я",
			},
			15,
			5,
		),
		line(
			{
				sk: "Línia čela",
				en: "Forehead line",
				ru: "Линия лба",
				uk: "Лінія чола",
			},
			15,
			10,
		),
		line(
			{
				sk: "Brada (fúzy)",
				en: "Beard",
				ru: "Борода",
				uk: "Борода",
			},
			30,
			35,
		),
		line(
			{
				sk: "Celá tvár",
				en: "Full face",
				ru: "Лицо полностью",
				uk: "Обличчя повністю",
			},
			60,
			45,
		),
	]);

	const handsBody = makeZone(HANDS_BODY, [
		line(
			{
				sk: "Ruky celé",
				en: "Full arms",
				ru: "Руки полностью",
				uk: "Руки повністю",
			},
			75,
			30,
		),
		line(
			{
				sk: "Ruky po lakeť",
				en: "Arms to elbow",
				ru: "Руки до локтя",
				uk: "Руки до ліктя",
			},
			"60–70",
			25,
		),
		line(
			{
				sk: "Podpazušie",
				en: "Underarms",
				ru: "Подмышки",
				uk: "Пахви",
			},
			35,
			15,
		),
		line(
			{ sk: "Plecia", en: "Shoulders", ru: "Плечи", uk: "Плечі" },
			50,
			15,
		),
		line(
			{
				sk: "Hrbet rúk",
				en: "Hands",
				ru: "Кисти",
				uk: "Кисті",
			},
			20,
			15,
		),
		line(
			{ sk: "Chrbát", en: "Back", ru: "Спина", uk: "Спина" },
			120,
			50,
		),
		line(
			{
				sk: "Krížová kosť",
				en: "Sacrum",
				ru: "Крестец",
				uk: "Крижі",
			},
			40,
			20,
		),
		line(
			{ sk: "Hruď", en: "Chest", ru: "Грудь", uk: "Груди" },
			65,
			30,
		),
		line(
			{
				sk: "Dekolt",
				en: "Décolleté",
				ru: "Декольте",
				uk: "Декольте",
			},
			40,
			15,
		),
		line(
			{
				sk: "Línia brucha",
				en: "Abdominal line",
				ru: "Линия живота",
				uk: "Лінія живота",
			},
			25,
			15,
		),
		line(
			{
				sk: "Brucho celé",
				en: "Full abdomen",
				ru: "Живот полностью",
				uk: "Живіт повністю",
			},
			150,
			40,
		),
		line(
			{
				sk: "Okolo bradaviek",
				en: "Around the nipples",
				ru: "Вокруг сосков",
				uk: "Навколо сосків",
			},
			25,
			10,
		),
	]);

	const bikini = makeZone(BIKINI, [
		line(
			{
				sk: "Klasické bikini",
				en: "Classic bikini",
				ru: "Бикини классическое",
				uk: "Класичне бікіні",
			},
			70,
			35,
		),
		line(
			{
				sk: "Zadok",
				en: "Buttocks",
				ru: "Ягодицы",
				uk: "Сідниці",
			},
			50,
			30,
		),
	]);

	const legs = makeZone(LEGS, [
		line(
			{
				sk: "Nohy celé",
				en: "Full legs",
				ru: "Ноги полностью",
				uk: "Ноги повністю",
			},
			150,
			75,
		),
		line(
			{
				sk: "Lýtka + koleno",
				en: "Calves + knees",
				ru: "Голени + колено",
				uk: "Гомілки + коліно",
			},
			85,
			35,
		),
		line(
			{
				sk: "Lýtka",
				en: "Calves",
				ru: "Голени",
				uk: "Гомілки",
			},
			70,
			30,
		),
		line(
			{
				sk: "Kolená",
				en: "Knees",
				ru: "Колени",
				uk: "Коліна",
			},
			20,
			15,
		),
		line(
			{
				sk: "Stehná",
				en: "Thighs",
				ru: "Бёдра",
				uk: "Стегна",
			},
			80,
			40,
		),
		line(
			{
				sk: "Prsty na nohách",
				en: "Toes",
				ru: "Пальцы",
				uk: "Пальці",
			},
			20,
			10,
		),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[0]!, LASER, [
		face,
		handsBody,
		bikini,
		legs,
	]);
}

function manWaxSection(): PriceSection {
	const z = makeZone(
		{
			sk: "Zóny",
			en: "Areas",
			ru: "Зоны",
			uk: "Зони",
		},
		[
			line(
				{
					sk: "Komplex „Svliekni sveter“ (chrbát + hruď + brucho)",
					en: "“Take off the sweater” package (back + chest + abdomen)",
					ru: "Комплекс «Сними свитер» (спина + грудь + живот)",
					uk: "Комплекс «Зніми светр» (спина + груди + живіт)",
				},
				95,
				90,
			),
			line(
				{ sk: "Chrbát", en: "Back", ru: "Спина", uk: "Спина" },
				40,
				30,
			),
			line(
				{ sk: "Hruď", en: "Chest", ru: "Грудь", uk: "Груди" },
				40,
				30,
			),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[1]!, WAX, [z]);
}

function manSugarSection(): PriceSection {
	const z = makeZone(
		{
			sk: "Zóny",
			en: "Areas",
			ru: "Зоны",
			uk: "Зони",
		},
		[
			line(
				{
					sk: "Podpazušie",
					en: "Underarms",
					ru: "Подмышки",
					uk: "Пахви",
				},
				15,
				20,
			),
			line(
				{
					sk: "Brucho celé",
					en: "Full abdomen",
					ru: "Живот полностью",
					uk: "Живіт повністю",
				},
				40,
				35,
			),
			line(
				{
					sk: "Komplex „Celá tvár“",
					en: "“Full face” package",
					ru: "Комплекс «Все лицо»",
					uk: "Комплекс «Усе обличчя»",
				},
				50,
				45,
			),
			line(
				{
					sk: "Ruky celé + podpazušie",
					en: "Full arms + underarms",
					ru: "Руки полностью + подмышки",
					uk: "Руки повністю + пахви",
				},
				30,
				45,
			),
			line(
				{
					sk: "Uši",
					en: "Ears",
					ru: "Уши",
					uk: "Вуха",
				},
				10,
				15,
			),
			line(
				{
					sk: "Nos",
					en: "Nose",
					ru: "Нос",
					uk: "Ніс",
				},
				10,
				10,
			),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[2]!, SUGAR, [z]);
}

function manPiercingSection(): PriceSection {
	const z = makeZone(
		{
			sk: "Piercing",
			en: "Piercing",
			ru: "Пирсинг",
			uk: "Пірсинг",
		},
		[
			line(
				{
					sk: "Môčková ucha (1)",
					en: "Ear lobe (1)",
					ru: "Мочка уха (1)",
					uk: "Мочка вуха (1)",
				},
				20,
				30,
			),
			line(
				{
					sk: "Môčková ucha (2)",
					en: "Ear lobe (2)",
					ru: "Мочка уха (2)",
					uk: "Мочка вуха (2)",
				},
				35,
				45,
			),
			line(
				{
					sk: "Helix",
					en: "Helix",
					ru: "Хеликс",
					uk: "Гелікс",
				},
				25,
				30,
			),
			line(
				{
					sk: "Industrial",
					en: "Industrial",
					ru: "Индастриал",
					uk: "Індастріал",
				},
				40,
				45,
			),
			line(
				{
					sk: "Ostatné piercingy",
					en: "Other piercings",
					ru: "Другие проколы",
					uk: "Інші проколи",
				},
				30,
				40,
			),
			line(
				{
					sk: "Downsize",
					en: "Downsize",
					ru: "Даунсайз",
					uk: "Даунсайз",
				},
				10,
				15,
			),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[4]!, PIERCING, [z]);
}

function manCoursesSection(): PriceSection {
	const z = makeZone(COURSES_ZONE, [
		lineTbd({
			sk: "Školenie voskovacej depilácie",
			en: "Waxing training courses",
			ru: "Курсы восковой депиляции",
			uk: "Курси воскової депіляції",
		}),
		lineTbd({
			sk: "Ďalšie odborné kurzy",
			en: "Other professional courses",
			ru: "Другие профессиональные курсы",
			uk: "Інші професійні курси",
		}),
	]);

	return makeSection(SECTION_CALENDAR_COLORS[6]!, COURSES_AND_TRAINING, [z]);
}

function manCosmetologySection(): PriceSection {
	const z = makeZone(
		{
			sk: "Procedúry",
			en: "Treatments",
			ru: "Процедуры",
			uk: "Процедури",
		},
		[
			line(
				{
					sk: "Mechanické čistenie tváre",
					en: "Manual facial cleansing",
					ru: "Механическая чистка лица",
					uk: "Механічна чистка обличчя",
				},
				55,
				60,
			),
			line(
				{
					sk: "Masáž tváre",
					en: "Facial massage",
					ru: "Массаж лица",
					uk: "Масаж обличчя",
				},
				"from 30",
				30,
			),
			line(
				{
					sk: "Peeling",
					en: "Peel",
					ru: "Пилинг",
					uk: "Пілінг",
				},
				30,
				45,
			),
			line(
				{
					sk: "Starostlivosť",
					en: "Care",
					ru: "Уход",
					uk: "Догляд",
				},
				55,
				60,
			),
		],
	);

	return makeSection(SECTION_CALENDAR_COLORS[5]!, COSMETOLOGY, [z]);
}

/** Full depilation price catalog (women / men) with SK, EN, RU, UK titles. */
export function buildDepilationPriceCatalogStructure(): PriceCatalogStructure {
	const womanService = makeService(DEPILATION, [
		womanLaserSection(),
		womanWaxSection(),
		womanSugarSection(),
		womanCosmetologySection(),
		womanCoursesSection(),
		womanAdditionalSection(),
	]);

	const manService = makeService(DEPILATION, [
		manLaserSection(),
		manWaxSection(),
		manSugarSection(),
		manPiercingSection(),
		manCoursesSection(),
		manCosmetologySection(),
	]);

	return {
		woman: { services: [womanService] },
		man: { services: [{ ...manService, id: generatePriceItemId() }] },
	};
}
