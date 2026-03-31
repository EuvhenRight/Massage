"use client";

import { useState, useEffect, useMemo } from "react";
import { getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  appointmentIntervalsFromDocs,
  queryAppointmentsOverlappingRange,
} from "@/lib/appointments-overlap-query";
import { useBookingFlow } from "./BookingFlowContext";
import {
  parseOccupiedSlots,
  getPrepBufferMinutes,
  type OccupiedSlot,
} from "@/lib/availability-firestore";
import { getBookingAccent } from "@/lib/booking-accent";
import type { Place } from "@/lib/places";
import { getSchedule } from "@/lib/schedule-firestore";
import PublicDatePicker from "./PublicDatePicker";
import TimeSlotPicker from "./TimeSlotPicker";

interface StepDateTimeProps {
  durationMinutes: number;
  place?: Place;
}

export default function StepDateTime({ durationMinutes, place = "massage" }: StepDateTimeProps) {
  const accent = useMemo(() => getBookingAccent(place), [place]);
  const { date, time, setDate, setTime } = useBookingFlow();
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
        const rangeStart = new Date(year, monthNum, 1);
        const rangeEnd = new Date(year, monthNum + 1, 0);
        rangeEnd.setHours(23, 59, 59, 999);
        const q = queryAppointmentsOverlappingRange(
          db,
          place,
          rangeStart,
          rangeEnd
        );
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const appointments = appointmentIntervalsFromDocs(snapshot.docs);
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
    <div className="space-y-4">
      <p className="text-icyWhite/60 text-sm">
        Pick a date and time that works for you.
      </p>

      <PublicDatePicker
        accent={accent}
        selectedDate={date}
        onSelectDate={setDate}
        occupiedSlots={occupiedSlots}
        durationMinutes={durationMinutes}
        month={month}
        onMonthChange={(d) => setMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
        schedule={schedule}
      />

      {date && (
        <TimeSlotPicker
          accent={accent}
          date={date}
          selectedTime={time}
          onSelectTime={setTime}
          occupiedSlots={occupiedSlots}
          durationMinutes={durationMinutes}
          schedule={schedule}
        />
      )}

      {loading && (
        <p className="text-xs text-icyWhite/45">Loading availability…</p>
      )}
    </div>
  );
}
