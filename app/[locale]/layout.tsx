import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

export function generateStaticParams() {
  return [
    { locale: "sk" },
    { locale: "en" },
    { locale: "ru" },
    { locale: "uk" },
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        {children}
        <Toaster theme="dark" position="bottom-center" />
      </Providers>
      <a
        href="/ru/admin"
        className="fixed bottom-4 right-4 text-xs text-icyWhite/40 hover:text-icyWhite/70 transition-colors"
      >
        Admin
      </a>
    </NextIntlClientProvider>
  );
}
