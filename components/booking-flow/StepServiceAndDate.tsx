"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBookingFlow } from "./BookingFlowContext";
import {
  parseOccupiedSlots,
  getPrepBufferMinutes,
  type OccupiedSlot,
} from "@/lib/availability-firestore";
import type { Place } from "@/lib/places";
import { getSchedule } from "@/lib/schedule-firestore";
import PublicDatePicker from "./PublicDatePicker";
import TimeSlotPicker from "./TimeSlotPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepServiceAndDateProps {
  services: { title: string; durationMinutes?: number }[];
  place?: Place;
}

export default function StepServiceAndDate({
  services,
  place = "massage",
}: StepServiceAndDateProps) {
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const { service, setService, date, setDate, setTime, time, durationMinutes } = useBookingFlow();
  const [month, setMonth] = useState(() => {
    const d = date ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const [loading, setLoading] = useState(true);

  const year = month.getFullYear();
  const monthNum = month.getMonth();

  useEffect(() => {
    getSchedule(place).then(setSchedule).catch(() => setSchedule(null));
  }, [place]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAppointments() {
      setLoading(true);
      try {
        const start = new Date(year, monthNum, 1);
        const end = new Date(year, monthNum + 1, 0);
        end.setHours(23, 59, 59, 999);
        const q = query(
          collection(db, "appointments"),
          where("place", "==", place),
          where("startTime", ">=", start),
          where("startTime", "<=", end)
        );
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const appointments = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            startTime: d.startTime as Timestamp,
            endTime: d.endTime as Timestamp,
          };
        });
        setOccupiedSlots(parseOccupiedSlots(appointments, getPrepBufferMinutes(schedule)));
      } catch {
        setOccupiedSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAppointments();
    return () => { cancelled = true; };
  }, [year, monthNum, place, schedule]);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-icyWhite/90">
            {tCommon("services")}
          </label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="h-11 bg-white/5 border-white/10 text-icyWhite hover:bg-white/[0.07] focus:ring-gold-soft/30">
              <SelectValue placeholder={t("selectService")} />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.title} value={s.title}>
                  {s.title}
                  {s.durationMinutes ? (
                    <span className="text-icyWhite/55 ml-1">({s.durationMinutes} min)</span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {date && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-icyWhite/90">
              {t("selectTime")}
            </label>
            <TimeSlotPicker
              date={date}
              selectedTime={time}
              onSelectTime={setTime}
              occupiedSlots={occupiedSlots}
              durationMinutes={durationMinutes}
              schedule={schedule}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-icyWhite/90">
            {t("selectDate")}
          </label>
          <PublicDatePicker
            selectedDate={date}
            onSelectDate={setDate}
            occupiedSlots={occupiedSlots}
            durationMinutes={durationMinutes}
            month={month}
            onMonthChange={(d) => setMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
            schedule={schedule}
          />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-icyWhite/45">{t("loadingAvailability")}</p>
      )}
    </div>
  );
}
