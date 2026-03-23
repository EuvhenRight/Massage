"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBookingFlow } from "./BookingFlowContext";
import {
  parseOccupiedSlots,
  getPrepBufferMinutes,
  type OccupiedSlot,
} from "@/lib/availability-firestore";
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
