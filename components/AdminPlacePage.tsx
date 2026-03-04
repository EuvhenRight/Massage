"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, CalendarRange, ExternalLink, LogOut, ChevronLeft, Info, BarChart2, Search, FileDown, Settings } from "lucide-react";
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
import { formatDate, formatTime } from "@/lib/format-date";
import { Timestamp } from "firebase/firestore";
import { clsx } from "clsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

type AdminSection = "calendar" | "settings" | "agenda" | "analytics";

function toAppointmentData(doc: { id: string; data: () => Record<string, unknown> }): AppointmentData {
  const d = doc.data();
  return {
    id: doc.id,
    startTime: (d.startTime as Timestamp) ?? new Date(),
    endTime: (d.endTime as Timestamp) ?? new Date(),
    service: (d.service as string) ?? "",
    fullName: (d.fullName as string) ?? "",
    email: (d.email as string) ?? "",
    phone: (d.phone as string) ?? "",
    place: (d.place as Place) ?? "massage",
    createdAt: d.createdAt as Timestamp | undefined,
  };
}

interface AdminPlacePageProps {
  place: Place;
  section?: AdminSection;
}

export default function AdminPlacePage({ place, section: sectionProp = "calendar" }: AdminPlacePageProps) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ru";
  const currentLocale = useLocale() as string;
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const placeLabel = tCommon(place === "massage" ? "massage" : "depilation");
  const section = sectionProp;
  const navItems: { id: AdminSection; label: string; icon: React.ElementType }[] = [
    { id: "calendar", label: t("calendar"), icon: Calendar },
    { id: "agenda", label: t("agenda"), icon: CalendarRange },
    { id: "analytics", label: t("analytics"), icon: BarChart2 },
    { id: "settings", label: t("settings"), icon: Settings },
  ];
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
  const [agendaAppointments, setAgendaAppointments] = useState<AppointmentData[]>([]);
  const [allAppointments, setAllAppointments] = useState<AppointmentData[]>([]);
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const prepBuffer = getPrepBufferMinutes(schedule);

  const filteredAnalytics = allAppointments.filter((apt) => {
    if (!analyticsSearch.trim()) return true;
    const q = analyticsSearch.toLowerCase().trim();
    const name = (apt.fullName ?? "").toLowerCase();
    const phone = (apt.phone ?? "").replace(/\s/g, "");
    const phoneNorm = phone.replace(/[\s\-\(\)]/g, "");
    const qNorm = q.replace(/[\s\-\(\)]/g, "");
    return name.includes(q) || phone.includes(q) || phoneNorm.includes(qNorm);
  });

  const exportAnalyticsPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(t("analytics") + " - " + placeLabel, 14, 15);
    doc.setFontSize(10);
    autoTable(doc, {
      head: [[tCommon("date"), tCommon("time"), tCommon("services"), t("customer"), t("emailHeader"), t("phoneHeader")]],
      body: filteredAnalytics.map((apt) => {
        const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
        return [
          formatDate(start, { locale: currentLocale }),
          formatTime(start, { locale: currentLocale }),
          apt.service,
          apt.fullName || "—",
          apt.email || "—",
          apt.phone || "—",
        ];
      }),
      startY: 22,
      theme: "grid",
      headStyles: { fillColor: [212, 175, 55] },
    });
    doc.save(`analytics-${place}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [filteredAnalytics, place, placeLabel, t, tCommon, currentLocale]);

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

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "appointments"),
      where("place", "==", place),
      where("startTime", ">=", startOfToday),
      orderBy("startTime", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setAgendaAppointments(snapshot.docs.map((doc) => toAppointmentData({ id: doc.id, data: () => doc.data() })));
    });
    return () => unsub();
  }, [place]);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("place", "==", place),
      orderBy("startTime", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setAllAppointments(snapshot.docs.map((doc) => toAppointmentData({ id: doc.id, data: () => doc.data() })));
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
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16 min-h-16">
          <div className="flex min-w-0 shrink items-center gap-4">
            <Link
              href={`/${locale}/admin`}
              className="flex shrink-0 items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors whitespace-nowrap min-w-[7rem] sm:min-w-[8.5rem]"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("backToCabinet")}</span>
            </Link>
            <span className="hidden shrink-0 text-icyWhite/40 sm:inline">|</span>
            <span className="hidden shrink-0 font-serif text-lg text-icyWhite sm:inline">{placeLabel}</span>
            <nav className="flex shrink-0 gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <Link
                  key={id}
                  href={id === "calendar" ? `/${locale}/admin/${place}` : `/${locale}/admin/${place}/${id}`}
                  className={clsx(
                    "flex min-w-[4rem] items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap sm:min-w-[5.5rem]",
                    section === id
                      ? "bg-gold-soft/20 text-gold-glow border border-gold-soft/40"
                      : "text-icyWhite/70 hover:text-icyWhite hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden truncate sm:inline">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="shrink-0">
              <LanguageSwitcher variant="admin" />
            </div>
            <Link
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[5rem] shrink-0 items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors whitespace-nowrap sm:min-w-[7.5rem]"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="hidden truncate sm:inline">{t("publicBooking")}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-3 border-l border-white/10 pl-3">
              {session?.user && (
                <span className="hidden max-w-[140px] truncate text-sm text-icyWhite/60 md:inline">
                  {session.user.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/sk" })}
                className="flex min-w-[4.5rem] shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/5 transition-colors whitespace-nowrap sm:min-w-[6rem]"
                aria-label={t("signOutAria")}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden truncate sm:inline">{t("signOut")}</span>
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

        {section === "agenda" && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">{t("agenda")}</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                {t("agendaSubtitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              {agendaAppointments.length === 0 ? (
                <div className="p-12 text-center text-icyWhite/50">
                  {t("noUpcomingAppointments")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("date")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("time")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("services")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{t("customer")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden md:table-cell">{t("emailHeader")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden lg:table-cell">{t("phoneHeader")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendaAppointments.map((apt) => {
                        const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
                        const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
                        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
                        return (
                          <tr
                            key={apt.id}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-icyWhite">{formatDate(start, { locale: currentLocale })}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite">{formatTime(start, { locale: currentLocale })}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite">
                              <span>{apt.service}</span>
                              <span className="text-icyWhite/50 text-xs ml-1">({duration}m)</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-icyWhite">{apt.fullName || "—"}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell">{apt.email || "—"}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite/80 hidden lg:table-cell">{apt.phone || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "analytics" && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">{t("analytics")}</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                {t("analyticsSubtitle")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icyWhite/50" />
                <input
                  type="search"
                  value={analyticsSearch}
                  onChange={(e) => setAnalyticsSearch(e.target.value)}
                  placeholder={t("searchByNameOrPhone")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:border-gold-soft/50"
                />
              </div>
              <button
                type="button"
                onClick={exportAnalyticsPdf}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gold-soft/50 bg-gold-soft/20 text-gold-glow hover:bg-gold-soft/30 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                {t("exportPdf")}
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              {filteredAnalytics.length === 0 ? (
                <div className="p-12 text-center text-icyWhite/50">
                  {analyticsSearch.trim() ? t("noSearchResults") : t("noCustomersYet")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("date")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("time")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{tCommon("services")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider">{t("customer")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden md:table-cell">{t("emailHeader")}</th>
                        <th className="px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden lg:table-cell">{t("phoneHeader")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalytics.map((apt) => {
                        const start = apt.startTime && "toDate" in apt.startTime ? apt.startTime.toDate() : new Date(apt.startTime as Date);
                        const end = apt.endTime && "toDate" in apt.endTime ? apt.endTime.toDate() : new Date(apt.endTime as Date);
                        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
                        return (
                          <tr
                            key={apt.id}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-icyWhite">{formatDate(start, { locale: currentLocale })}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite">{formatTime(start, { locale: currentLocale })}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite">
                              <span>{apt.service}</span>
                              <span className="text-icyWhite/50 text-xs ml-1">({duration}m)</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-icyWhite">{apt.fullName || "—"}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell">{apt.email || "—"}</td>
                            <td className="px-4 py-3 text-sm text-icyWhite/80 hidden lg:table-cell">{apt.phone || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
            <div className="space-y-6 max-w-5xl mx-auto">
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
                  <AdminAvailabilityManager
                    place={place}
                    schedule={schedule}
                    onScheduleChange={setSchedule}
                    appointments={allAppointments.filter((a) => a.place === place)}
                  />
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
