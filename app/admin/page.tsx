"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import BookingCalendarGrid from "@/components/BookingCalendarGrid";
import AdminAppointmentModal from "@/components/AdminAppointmentModal";
import type { AppointmentData } from "@/lib/book-appointment";

const SERVICE_LEGEND = [
  { service: "Swedish Massage", color: "bg-amber-500/30 border-amber-500/60" },
  { service: "Deep Tissue", color: "bg-rose-500/30 border-rose-500/60" },
  { service: "Hot Stone", color: "bg-orange-500/30 border-orange-500/60" },
  { service: "Aromatherapy", color: "bg-violet-500/30 border-violet-500/60" },
  { service: "Sports Recovery", color: "bg-emerald-500/30 border-emerald-500/60" },
  { service: "Couples Retreat", color: "bg-pink-500/30 border-pink-500/60" },
  { service: "Other", color: "bg-aurora-magenta/30 border-aurora-magenta/50" },
];

export default function AdminPage() {
  const { data: session } = useSession();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<{
    date: Date;
    hour: number;
    minute: number;
  } | null>(null);
  const [editAppointment, setEditAppointment] = useState<AppointmentData | null>(null);

  const handleCellClick = useCallback((date: Date, hour: number, minute: number) => {
    setEditSlot({ date, hour, minute });
    setEditAppointment(null);
    setAddModalOpen(true);
  }, []);

  const handleEditAppointment = useCallback((appointment: AppointmentData) => {
    setEditAppointment(appointment);
    setEditSlot(null);
    setEditModalOpen(true);
  }, []);

  return (
    <main className="min-h-screen bg-nearBlack text-icyWhite p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-gold-soft hover:text-gold-glow transition-colors text-sm"
          >
            ← Back to Aurora
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/booking"
              className="text-sm text-icyWhite/70 hover:text-icyWhite"
            >
              Public booking →
            </Link>
            {session?.user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-icyWhite/60 truncate max-w-[180px]">
                  {session.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm text-icyWhite/60 hover:text-icyWhite transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
            <h1 className="font-serif text-2xl text-icyWhite">Admin — Appointments</h1>
          </div>
        </div>

        {/* Service color legend */}
        <div className="mb-6 flex flex-wrap gap-3">
          {SERVICE_LEGEND.map(({ service, color }) => (
            <div
              key={service}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}
            >
              <div className="w-2 h-2 rounded-full bg-current opacity-80" />
              <span className="text-sm">{service}</span>
            </div>
          ))}
        </div>

        <p className="text-icyWhite/70 text-sm mb-6">
          Click a slot to add, or drag/edit/cancel appointments.
        </p>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setEditSlot({ date: today, hour: 9, minute: 0 });
              setEditAppointment(null);
              setAddModalOpen(true);
            }}
            className="rounded-lg border border-gold-soft/50 bg-gold-soft/20 px-4 py-2 text-sm font-medium text-gold-soft hover:bg-gold-soft/30 transition-colors"
          >
            + Add appointment
          </button>
        </div>

        <BookingCalendarGrid
          allowCancel
          allowDrag
          onCellClick={handleCellClick}
          onEditAppointment={handleEditAppointment}
        />

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
        />

        <AdminAppointmentModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditAppointment(null);
          }}
          mode="edit"
          appointment={editAppointment}
        />
      </div>
    </main>
  );
}
