"use client";

import { useEffect, useState } from "react";

function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  if (h === 0) return `12:${String(m).padStart(2, "0")} am`;
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} am`;
  if (h === 12) return `12:${String(m).padStart(2, "0")} pm`;
  return `${h - 12}:${String(m).padStart(2, "0")} pm`;
}
import { toast } from "sonner";
import { bookAppointmentAdmin, updateAppointment, type AppointmentData, type AdminBookingInput } from "@/lib/book-appointment";
import { getDateKey } from "@/lib/booking";
import type { ServiceData } from "@/lib/services";
import type { Place } from "@/lib/places";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AdminDatePicker from "@/components/AdminDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "add" | "edit";
  defaultDate?: Date;
  defaultHour?: number;
  defaultMinute?: number;
  appointment?: AppointmentData | null;
  services?: ServiceData[];
  place?: Place;
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
  services = [],
  place = "massage",
}: AdminAppointmentModalProps) {
  const isEdit = mode === "edit" && appointment;
  const now = Date.now();
  const endDateForPast =
    appointment && (appointment.endTime && "toDate" in appointment.endTime ? appointment.endTime.toDate() : new Date(appointment.endTime as Date));
  const isPastAppointment = Boolean(
    isEdit && appointment && endDateForPast && endDateForPast.getTime() < now
  );

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
    isEdit ? getDateKey(startDate) : getDateKey(defaultDate)
  );
  const [hour, setHour] = useState(isEdit ? startDate.getHours() : defaultHour);
  const [minute, setMinute] = useState(
    isEdit ? Math.round(startDate.getMinutes() / 5) * 5 : Math.round(defaultMinute / 5) * 5
  );
  const [duration, setDuration] = useState(durationMinutes);
  const [service, setService] = useState(appointment?.service ?? "");

  const selectedService = services.find((s) => s.title === service);
  const [fullName, setFullName] = useState(appointment?.fullName ?? "");
  const [email, setEmail] = useState(appointment?.email ?? "");
  const [phone, setPhone] = useState(appointment?.phone ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && appointment) {
        const s = appointment.startTime && "toDate" in appointment.startTime
          ? appointment.startTime.toDate()
          : new Date(appointment.startTime as Date);
        const e = appointment.endTime && "toDate" in appointment.endTime
          ? appointment.endTime.toDate()
          : new Date(appointment.endTime as Date);
        setDateStr(getDateKey(s));
        setHour(s.getHours());
        setMinute(Math.round(s.getMinutes() / 5) * 5);
        const dur = Math.round((e.getTime() - s.getTime()) / 60000);
        setDuration(dur);
        setService(appointment.service ?? "");
        setFullName(appointment.fullName ?? "");
        setEmail(appointment.email ?? "");
        setPhone(appointment.phone ?? "");
      } else {
        setDateStr(getDateKey(defaultDate));
        setHour(defaultHour);
        setMinute(Math.round(defaultMinute / 5) * 5);
        setDuration(services[0]?.durationMinutes ?? 60);
        setService(services[0]?.title ?? "");
        setFullName("");
        setEmail("");
        setPhone("");
      }
    }
  }, [isOpen, isEdit, appointment, defaultDate, defaultHour, defaultMinute, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPastAppointment) return;
    const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const slotStart = new Date(`${dateStr}T${startTime}:00`);
    if (!isEdit && slotStart.getTime() < Date.now()) {
      toast.error("Cannot create appointment in the past.");
      return;
    }
    setLoading(true);
    try {
      const dur = isEdit
        ? duration
        : (selectedService ? selectedService.durationMinutes : 60);

      if (isEdit && appointment) {
        const newStart = new Date(`${dateStr}T${startTime}:00`);
        await updateAppointment(
          appointment.id,
          {
            service: service || undefined,
            fullName: fullName || undefined,
            email: email || undefined,
            phone: phone || undefined,
            startTime: newStart,
            durationMinutes: dur,
          },
          place
        );
        toast.success("Appointment updated.");
      } else {
        const input: AdminBookingInput = {
          date: dateStr,
          startTime,
          durationMinutes: dur,
          service: service || undefined,
          fullName: fullName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        };
        await bookAppointmentAdmin(input, place);
        if (email?.trim() && email.includes("@")) {
          const slotDate = new Date(`${dateStr}T${startTime}:00`);
          try {
            const res = await fetch("/api/send-confirmation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "new",
                source: "admin",
                to: email.trim(),
                customerName: fullName?.trim() || "Customer",
                date: slotDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                time: slotDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }),
                service: service || undefined,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              toast.error(`Appointment added, but email failed: ${data?.error ?? "Could not send"}`);
            } else {
              toast.success("Appointment added. Customer notified by email.");
            }
          } catch {
            toast.success("Appointment added. Email could not be sent.");
          }
        } else {
          toast.success("Appointment added.");
        }
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
        {isPastAppointment && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            This appointment is in the past. View only — no changes allowed.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={!!isPastAppointment} className="space-y-4 [&:disabled]:opacity-75">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-icyWhite/80">Date</Label>
              <AdminDatePicker
                value={dateStr}
                onChange={setDateStr}
                minDate={!isEdit ? (() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  return t;
                })() : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-icyWhite/80">Time</Label>
              <Select
                value={`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
                onValueChange={(v) => {
                  const [h, m] = v.split(":").map(Number);
                  setHour(h);
                  setMinute(m);
                }}
              >
                <SelectTrigger className="select-menu">
                  <SelectValue placeholder="Choose time" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-[100] max-h-[200px]"
                >
                  {(() => {
                    const slots: string[] = [];
                    for (let h = 0; h <= 23; h++) {
                      for (let m = 0; m < 60; m += 5) {
                        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                      }
                    }
                    return slots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {formatTimeSlot(slot)}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-icyWhite/80">Service</Label>
            <Select
              value={service || "none"}
              onValueChange={(v) => {
                const val = v === "none" ? "" : v;
                setService(val);
                const svc = services.find((s) => s.title === val);
                if (svc) setDuration(svc.durationMinutes);
              }}
            >
              <SelectTrigger className="select-menu">
                <SelectValue placeholder="Choose service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.title}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-icyWhite/80">Duration</Label>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-icyWhite text-sm">
              {selectedService
                ? `${selectedService.durationMinutes} min`
                : isEdit
                  ? `${duration} min`
                  : "— Select a service"}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-icyWhite/80">Name (optional)</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="—"
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-icyWhite/80">Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="—"
              className="bg-white/5 border-white/10 text-icyWhite"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-icyWhite/80">Phone (optional)</Label>
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
              {isPastAppointment ? "Close" : "Cancel"}
            </Button>
            {!isPastAppointment && (
              <Button
                type="submit"
                className="flex-1 bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30"
                disabled={loading}
              >
                {loading ? "Saving..." : isEdit ? "Save" : "Add"}
              </Button>
            )}
          </div>
          </fieldset>
        </form>
      </div>
    </>
  );
}
