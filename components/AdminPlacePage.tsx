"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, Scissors, ExternalLink, LogOut, ChevronLeft, Info } from "lucide-react";
import BookingCalendarGrid from "@/components/BookingCalendarGrid";
import AdminAppointmentModal from "@/components/AdminAppointmentModal";
import AdminServicesInline from "@/components/AdminServicesInline";
import AdminAvailabilityManager from "@/components/AdminAvailabilityManager";
import type { AppointmentData } from "@/lib/book-appointment";
import type { ServiceData } from "@/lib/services";
import type { Place } from "@/lib/places";
import { PLACE_LABELS } from "@/lib/places";
import { getPrepBufferMinutes } from "@/lib/availability-firestore";
import { getSchedule } from "@/lib/schedule-firestore";
import { clsx } from "clsx";
type AdminSection = "calendar" | "services" | "availability";

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "services", label: "Services", icon: Scissors },
  { id: "availability", label: "Working hours", icon: Clock },
];

interface AdminPlacePageProps {
  place: Place;
}

export default function AdminPlacePage({ place }: AdminPlacePageProps) {
  const { data: session } = useSession();
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

  const placeLabel = PLACE_LABELS[place];
  const bookingUrl = place === "massage" ? "/massage/booking" : "/depilation/booking";
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const prepBuffer = getPrepBufferMinutes(schedule);

  useEffect(() => {
    getSchedule(place).then(setSchedule).catch(() => setSchedule(null));
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
              href="/admin"
              className="flex items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to cabinet
            </Link>
            <span className="text-icyWhite/40 hidden sm:inline">|</span>
            <span className="font-serif text-lg text-icyWhite hidden sm:inline">{placeLabel}</span>
            <nav className="flex gap-1">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
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
            <Link
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-icyWhite/70 hover:text-gold-soft transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Public booking</span>
            </Link>
            {session?.user && (
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <span className="text-sm text-icyWhite/60 truncate max-w-[140px] hidden md:inline">
                  {session.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="p-2 rounded-lg text-icyWhite/60 hover:text-icyWhite hover:bg-white/5 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        {section === "calendar" && (
          <div className="space-y-4 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">Appointments</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                Drag to reschedule. Use <strong>Week</strong> view to move appointments to another day or time. Past times are disabled. Use the Add appointment button to create.
              </p>
              <p className="text-icyWhite/40 text-xs mt-0.5 flex items-center gap-1.5">
                <span
                  title={`${prepBuffer} minutes are reserved after each appointment for preparation. This time cannot be booked and ensures clients never overlap. Configure in Working hours.`}
                  className="inline-flex cursor-help rounded-full p-0.5 text-icyWhite/50 hover:text-gold-soft/80 hover:bg-gold-soft/10 transition-colors"
                  aria-label="Prep buffer info"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
                {prepBuffer} minute prep time is automatically kept between appointments so clients never overlap.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-xl">
              <AdminServicesInline services={services} onServicesChange={setServices} place={place} />
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

        {section === "services" && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            <div>
              <h1 className="font-serif text-2xl text-icyWhite">Services</h1>
              <p className="text-icyWhite/60 text-sm mt-0.5">
                Manage services customers can book for {placeLabel}. Each service has a title, color, and duration.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-xl max-w-2xl">
              <AdminServicesInline services={services} onServicesChange={setServices} place={place} />
            </div>
          </div>
        )}

        {section === "availability" && (
          <div className="animate-in fade-in-0 duration-200">
            <h1 className="font-serif text-2xl text-icyWhite mb-1">Working hours</h1>
            <p className="text-icyWhite/60 text-sm mb-6">
              Set when customers can book {placeLabel}. Use the month picker to set hours for specific months. Closed days won&apos;t appear in the public calendar.
            </p>
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl max-w-5xl">
              <AdminAvailabilityManager place={place} schedule={schedule} onScheduleChange={setSchedule} />
            </div>
          </div>
        )}
      </div>

      {section === "calendar" && (
        <button
          type="button"
          onClick={openAddAppointment}
          aria-label="Add appointment"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gold-soft/25 border border-gold-soft/50 text-gold-glow font-medium shadow-lg shadow-gold-soft/10 hover:bg-gold-soft/35 hover:shadow-gold-soft/20 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-gold-soft focus:ring-offset-2 focus:ring-offset-nearBlack"
        >
          <span className="text-lg leading-none">+</span>
          Add appointment
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
