"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBookingFlow } from "./BookingFlowContext";
import {
  parseOccupiedSlots,
  type OccupiedSlot,
} from "@/lib/availability-firestore";
import PublicDatePicker from "./PublicDatePicker";
import TimeSlotPicker from "./TimeSlotPicker";

interface StepDateTimeProps {
  durationMinutes: number;
}

export default function StepDateTime({ durationMinutes }: StepDateTimeProps) {
  const { date, time, setDate, setTime } = useBookingFlow();
  const [month, setMonth] = useState(() => {
    const d = date ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const year = month.getFullYear();
  const monthNum = month.getMonth();

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
        setOccupiedSlots(parseOccupiedSlots(appointments));
      } catch {
        setOccupiedSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAppointments();
    return () => { cancelled = true; };
  }, [year, monthNum]);

  return (
    <div className="space-y-4">
      <p className="text-icyWhite/60 text-sm">
        Pick a date and time that works for you.
      </p>

      <PublicDatePicker
        selectedDate={date}
        onSelectDate={setDate}
        occupiedSlots={occupiedSlots}
        durationMinutes={durationMinutes}
        month={month}
        onMonthChange={(d) => setMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
      />

      {date && (
        <TimeSlotPicker
          date={date}
          selectedTime={time}
          onSelectTime={setTime}
          occupiedSlots={occupiedSlots}
          durationMinutes={durationMinutes}
        />
      )}

      {loading && (
        <p className="text-xs text-icyWhite/45">Loading availability…</p>
      )}
    </div>
  );
}
