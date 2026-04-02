"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useBookingFlow } from "./BookingFlowContext";
import type { OccupiedSlot } from "@/lib/availability-firestore";
import { fetchMergedPublicOccupiedSlots } from "@/lib/booking-occupied-slots";
import { getBookingAccent } from "@/lib/booking-accent";
import type { Place } from "@/lib/places";
import { getSchedule } from "@/lib/schedule-firestore";
import TimeSlotPicker from "./TimeSlotPicker";

interface StepTimeProps {
  durationMinutes: number;
  place?: Place;
}

export default function StepTime({
  durationMinutes,
  place = "massage",
}: StepTimeProps) {
  const accent = useMemo(() => getBookingAccent(place), [place]);
  const locale = useLocale();
  const t = useTranslations("booking");
  const { date, time, setTime } = useBookingFlow();
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [schedule, setSchedule] = useState<Awaited<ReturnType<typeof getSchedule>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule(place).then(setSchedule).catch(() => setSchedule(null));
  }, [place]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    const year = date.getFullYear();
    const monthNum = date.getMonth();
    async function fetchAppointments() {
      setLoading(true);
      try {
        const rangeStart = new Date(year, monthNum, 1);
        const rangeEnd = new Date(year, monthNum + 1, 0);
        rangeEnd.setHours(23, 59, 59, 999);
        const merged = await fetchMergedPublicOccupiedSlots(
          place,
          rangeStart,
          rangeEnd,
          schedule
        );
        if (cancelled) return;
        setOccupiedSlots(merged);
      } catch {
        setOccupiedSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAppointments();
    return () => { cancelled = true; };
  }, [date, place, schedule]);

  if (!date) return null;

  return (
    <div className="space-y-4">
      <p className="text-icyWhite/70 text-sm">
        {t("availableTimesFor")}{" "}
        <strong className="text-icyWhite font-medium">
          {date.toLocaleDateString(locale, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </strong>
      </p>

      <TimeSlotPicker
        accent={accent}
        date={date}
        selectedTime={time}
        onSelectTime={setTime}
        occupiedSlots={occupiedSlots}
        durationMinutes={durationMinutes}
        schedule={schedule}
      />

      {loading && (
        <p className="text-xs text-icyWhite/45">{t("loadingTimes")}</p>
      )}
    </div>
  );
}
