"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bookAppointmentAdmin, updateAppointment, type AppointmentData, type AdminBookingInput } from "@/lib/book-appointment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SERVICES = [
  "Swedish Massage",
  "Deep Tissue",
  "Hot Stone",
  "Aromatherapy",
  "Sports Recovery",
  "Couples Retreat",
  "Other",
];

interface AdminAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "add" | "edit";
  defaultDate?: Date;
  defaultHour?: number;
  defaultMinute?: number;
  appointment?: AppointmentData | null;
}

export default function AdminAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  defaultDate = new Date(),
  defaultHour = 9,
  defaultMinute = 0,
  appointment,
}: AdminAppointmentModalProps) {
  const isEdit = mode === "edit" && appointment;

  const startDate = appointment
    ? (appointment.startTime && "toDate" in appointment.startTime
        ? appointment.startTime.toDate()
        : new Date(appointment.startTime as Date))
    : new Date(defaultDate);
  const endDate = appointment
    ? (appointment.endTime && "toDate" in appointment.endTime
        ? appointment.endTime.toDate()
        : new Date(appointment.endTime as Date))
    : new Date(startDate);
  const durationMinutes = appointment
    ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    : 60;

  const [dateStr, setDateStr] = useState(
    isEdit ? startDate.toISOString().slice(0, 10) : defaultDate.toISOString().slice(0, 10)
  );
  const [hour, setHour] = useState(isEdit ? startDate.getHours() : defaultHour);
  const [minute, setMinute] = useState(isEdit ? startDate.getMinutes() : defaultMinute);
  const [duration, setDuration] = useState(durationMinutes);
  const [service, setService] = useState(appointment?.service ?? "");
  const [fullName, setFullName] = useState(appointment?.fullName ?? "");
  const [email, setEmail] = useState(appointment?.email ?? "");
  const [phone, setPhone] = useState(appointment?.phone ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && appointment) {
        const s = appointment.startTime && "toDate" in appointment.startTime
          ? appointment.startTime.toDate()
          : new Date(appointment.startTime as Date);
        const e = appointment.endTime && "toDate" in appointment.endTime
          ? appointment.endTime.toDate()
          : new Date(appointment.endTime as Date);
        setDateStr(s.toISOString().slice(0, 10));
        setHour(s.getHours());
        setMinute(s.getMinutes());
        setDuration(Math.round((e.getTime() - s.getTime()) / 60000));
        setService(appointment.service ?? "");
        setFullName(appointment.fullName ?? "");
        setEmail(appointment.email ?? "");
        setPhone(appointment.phone ?? "");
      } else {
        setDateStr(defaultDate.toISOString().slice(0, 10));
        setHour(defaultHour);
        setMinute(defaultMinute);
        setDuration(60);
        setService("");
        setFullName("");
        setEmail("");
        setPhone("");
      }
    }
  }, [isOpen, isEdit, appointment, defaultDate, defaultHour, defaultMinute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      if (isEdit && appointment) {
        const newStart = new Date(`${dateStr}T${startTime}:00`);
        await updateAppointment(appointment.id, {
          service: service || undefined,
          fullName: fullName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          startTime: newStart,
          durationMinutes: duration,
        });
        toast.success("Appointment updated.");
      } else {
        const input: AdminBookingInput = {
          date: dateStr,
          startTime,
          durationMinutes: duration,
          service: service || undefined,
          fullName: fullName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        };
        await bookAppointmentAdmin(input);
        toast.success("Appointment added.");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error && err.message === "OVERLAP"
        ? "This time slot is already booked."
        : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="fixed left-1/2 top-1/2 z-[51] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl text-icyWhite mb-6">
          {isEdit ? "Edit appointment" : "Add appointment"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-icyWhite/80 mb-1.5">Date</label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="bg-white/5 border-white/10 text-icyWhite"
              />
            </div>
            <div>
              <label className="block text-sm text-icyWhite/80 mb-1.5">Time</label>
              <div className="flex gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-icyWhite text-sm"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}:00</option>
                  ))}
                </select>
                <select
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-icyWhite text-sm"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-icyWhite/80 mb-1.5">Duration (min)</label>
            <Input
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div>
            <label className="block text-sm text-icyWhite/80 mb-1.5">Service (optional)</label>
            <Select value={service || "none"} onValueChange={(v) => setService(v === "none" ? "" : v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-icyWhite">
                <SelectValue placeholder="Select or leave empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-icyWhite/80 mb-1.5">Name (optional)</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="—"
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div>
            <label className="block text-sm text-icyWhite/80 mb-1.5">Email (optional)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="—"
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div>
            <label className="block text-sm text-icyWhite/80 mb-1.5">Phone (optional)</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="—"
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-icyWhite hover:bg-white/10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30"
              disabled={loading}
            >
              {loading ? "Saving..." : isEdit ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
