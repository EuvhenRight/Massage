"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Clock, ExternalLink, LogOut, ChevronLeft, Info, Settings } from "lucide-react";
import BookingCalendarGrid from "@/components/BookingCalendarGrid";
import AdminAppointmentModal from "@/components/AdminAppointmentModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminServicesInline from "@/components/AdminServicesInline";
import AdminAvailabilityManager from "@/components/AdminAvailabilityManager";
import type { AppointmentData } from "@/lib/book-appointment";
import type { ServiceData } from "@/lib/services";
import type { Place } from "@/lib/places";
import { getPrepBufferMinutes } from "@/lib/availability-firestore";
import { getSchedule } from "@/lib/schedule-firestore";
import { clsx } from "clsx";
type AdminSection = "calendar" | "settings";

interface AdminPlacePageProps {
  place: Place;
}

export default function AdminPlacePage({ place }: AdminPlacePageProps) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ru";
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const placeLabel = tCommon(place === "massage" ? "massage" : "depilation");
  const navItems: { id: AdminSection; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: t("calendar"), icon: Calendar },
    { id: "settings", label: t("settings"), icon: Settings },
  ];
  const [section, setSection] = useState<AdminSection>("calendar");
  const [services, setServices] = useState<ServiceData[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<{
    date: Date;
    hour: number;
    minute: number;
  } | null>(null);
  const [editAppointment, setEditAppointment] = useState<AppointmentData | null>(null);

  const bookingUrl = place === "massage" ? `/${locale}/massage/booking` : `/${locale}/depilation/booking`;
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const prepBuffer = getPrepBufferMinutes(schedule);

  useEffect(() => {
    getSchedule(place).then(setSchedule).catch(() => setSchedule(null));
  }, [place]);

  useEffect(() => {
    const q = query(
      collection(db, "services"),
      where("place", "==", place),
      orderBy("title", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data.title as string) ?? "",
          color: (data.color as string) ?? "bg-gray-500/30 border-gray-500/60",
          durationMinutes: (data.durationMinutes as number) ?? 60,
        };
      });
      setServices(list);
    });
    return () => unsub();
  }, [place]);


  const handleEditAppointment = useCallback((appointment: AppointmentData) => {
    setEditAppointment(appointment);
    setEditSlot(null);
    setEditModalOpen(true);
  }, []);

  const openAddAppointment = useCallback(() => {
    const today = new Date();
    setEditSlot({ date: today, hour: 9, minute: 0 });
    setEditAppointment(null);
    setAddModalOpen(true);
  }, []);

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-nearBlack/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/admin`}
              className="flex items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("backToCabinet")}
            </Link>
            <span className="text-icyWhite/40 hidden sm:inline">|</span>
            <span className="font-serif text-lg text-icyWhite hidden sm:inline">{placeLabel}</span>
            <nav className="flex gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    section === id
                      ? "bg-gold-soft/20 text-gold-glow border border-gold-soft/40"
                      : "text-icyWhite/70 hover:text-icyWhite hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="admin" className="mr-2" />
            <Link
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">{t("publicBooking")}</span>
            </Link>
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              {session?.user && (
                <span className="text-sm text-icyWhite/60 truncate max-w-[140px] hidden md:inline">
                  {session.user.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/sk" })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/5 transition-colors"
                aria-label={t("signOutAria")}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("signOut")}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        {section === "calendar" && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">{t("appointments")}</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                {t("appointmentsSubtitle")}
              </p>
              <p className="text-icyWhite/40 text-xs mt-0.5 flex items-center gap-1.5">
                <span
                  title={t("prepBufferInfoTitle", { minutes: prepBuffer })}
                  className="inline-flex cursor-help rounded-full p-0.5 text-icyWhite/50 hover:text-gold-soft/80 hover:bg-gold-soft/10 transition-colors"
                  aria-label={t("prepBufferInfoTitle", { minutes: prepBuffer })}
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
                {t("prepBufferNote", { minutes: prepBuffer })}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <span className="text-xs text-icyWhite/50 mr-2">{t("servicesLabel")}</span>
              {services.length === 0 ? (
                <span className="text-sm text-icyWhite/40">{t("noServicesYet")}</span>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {services.map((s) => (
                    <span
                      key={s.id}
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm",
                        s.color
                      )}
                    >
                      {s.title}
                      <span className="text-xs text-icyWhite/70">({s.durationMinutes}m)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <BookingCalendarGrid
                allowCancel
                allowDrag
                onEditAppointment={handleEditAppointment}
                services={services}
                place={place}
              />
            </div>
          </div>
        )}

        {section === "settings" && (
          <div className="space-y-8 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">{t("settings")}</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                {t("settingsSubtitle", { place: placeLabel })}
              </p>
            </div>
            <div className="space-y-6 max-w-5xl">
              <section>
                <h2 className="font-medium text-icyWhite mb-2">{tCommon("services")}</h2>
                <p className="text-sm text-icyWhite/60 mb-3">
                  {t("manageServicesNote")}
                </p>
                <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <AdminServicesInline services={services} onServicesChange={setServices} place={place} />
                </div>
              </section>
              <section>
                <h2 className="font-medium text-icyWhite mb-2">{t("workingHours")}</h2>
                <p className="text-sm text-icyWhite/60 mb-3">
                  {t("manageWorkingHoursNote")}
                </p>
                <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <AdminAvailabilityManager place={place} schedule={schedule} onScheduleChange={setSchedule} />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {section === "calendar" && (
        <button
          type="button"
          onClick={openAddAppointment}
          aria-label={t("addAppointment")}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gold-soft/25 border border-gold-soft/50 text-gold-glow font-medium shadow-lg shadow-gold-soft/10 hover:bg-gold-soft/35 hover:shadow-gold-soft/20 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-gold-soft focus:ring-offset-2 focus:ring-offset-nearBlack"
        >
          <span className="text-lg leading-none">+</span>
          {t("addAppointment")}
        </button>
      )}

      <AdminAppointmentModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditSlot(null);
        }}
        mode="add"
        defaultDate={editSlot?.date}
        defaultHour={editSlot?.hour}
        defaultMinute={editSlot?.minute}
        services={services}
        place={place}
      />

      <AdminAppointmentModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditAppointment(null);
        }}
        mode="edit"
        appointment={editAppointment}
        services={services}
        place={place}
      />
    </main>
  );
}
