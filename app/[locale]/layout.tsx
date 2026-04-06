import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { JsonLd } from "@/components/JsonLd";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return [
    { locale: "sk" },
    { locale: "en" },
    { locale: "ru" },
    { locale: "uk" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "home");
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <JsonLd />
      <Providers>
        {children}
        <Toaster theme="dark" position="bottom-center" />
      </Providers>
    </NextIntlClientProvider>
  );
}
