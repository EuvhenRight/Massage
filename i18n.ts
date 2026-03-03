export const locales = ["sk", "en", "ru", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sk";
