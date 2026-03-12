"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import BookingFlow from "@/components/booking-flow";
import type { ServiceData } from "@/lib/services";

export default function MassageBookingPage() {
  const locale = useLocale();
  const t = useTranslations("booking");
  const [services, setServices] = useState<ServiceData[]>([]);

  // Prevent page scroll on mobile (iOS Safari viewport fix)
  useEffect(() => {
    document.documentElement.classList.add("booking-page-no-scroll");
    return () => {
      document.documentElement.classList.remove("booking-page-no-scroll");
    };
  }, []);

  useEffect(() => {
    fetch(`/api/services?place=massage&locale=${locale}`)
      .then((r) => r.ok && r.json())
      .then((data) => (Array.isArray(data) ? setServices(data) : []))
      .catch(() => {});
  }, [locale]);

  const serviceOptions = services.map((s) => ({
    id: s.id,
    title: s.title,
    durationMinutes: s.durationMinutes,
    titleSk: s.titleSk,
    titleEn: s.titleEn,
    titleRu: s.titleRu,
    titleUk: s.titleUk,
  }));

  return (
    <main className="fixed inset-0 z-0 h-[100dvh] max-h-[100dvh] bg-nearBlack text-icyWhite flex flex-col overflow-hidden overscroll-none">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-16 md:pt-20 pb-4 md:pb-6 px-4 sm:px-6 lg:px-8">
        <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-nearBlack/50 overflow-hidden">
            <BookingFlow
              services={serviceOptions.length > 0 ? serviceOptions : [{ title: t("appointmentFallback"), durationMinutes: 60 }]}
              defaultDuration={60}
              place="massage"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
