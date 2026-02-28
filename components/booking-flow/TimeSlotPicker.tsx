"use client";

import { useMemo } from "react";
import type { OccupiedSlot } from "@/lib/availability-firestore";
import { getAvailableTimeSlots } from "@/lib/availability-firestore";

interface TimeSlotPickerProps {
  date: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  occupiedSlots: OccupiedSlot[];
  durationMinutes: number;
}

function formatSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (h === 0) return `12:${String(m).padStart(2, "0")} am`;
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} am`;
  if (h === 12) return `12:${String(m).padStart(2, "0")} pm`;
  return `${h - 12}:${String(m).padStart(2, "0")} pm`;
}

export default function TimeSlotPicker({
  date,
  selectedTime,
  onSelectTime,
  occupiedSlots,
  durationMinutes,
}: TimeSlotPickerProps) {
  const availableSlots = useMemo(
    () => getAvailableTimeSlots(date, durationMinutes, occupiedSlots),
    [date, durationMinutes, occupiedSlots]
  );

  if (availableSlots.length === 0) {
    return (
      <p className="text-sm text-icyWhite/50 py-2">
        No available times for this date.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-icyWhite/70">Select time</span>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
        {availableSlots.map((slot) => {
          const isSelected = selectedTime === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectTime(slot)}
              className={`
                px-2 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation
                ${isSelected
                  ? "bg-gold-soft text-nearBlack ring-1 ring-gold-soft"
                  : "bg-white/5 border border-white/10 text-icyWhite hover:border-gold-soft/40 hover:bg-gold-soft/10"
                }
              `}
            >
              {formatSlot(slot)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
