"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { OccupiedSlot } from "@/lib/availability-firestore";
import { getAvailableTimeSlots } from "@/lib/availability-firestore";
import type { ScheduleData } from "@/lib/schedule-firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeSlotPickerProps {
  date: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  occupiedSlots: OccupiedSlot[];
  durationMinutes: number;
  schedule?: ScheduleData | null;
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
  schedule = null,
}: TimeSlotPickerProps) {
  const availableSlots = useMemo(
    () => getAvailableTimeSlots(date, durationMinutes, occupiedSlots, schedule),
    [date, durationMinutes, occupiedSlots, schedule]
  );

  const t = useTranslations("booking");

  if (availableSlots.length === 0) {
    return (
      <div className="rounded-lg border border-gold-soft/20 bg-gold-soft/5 px-4 py-4">
        <p className="text-sm text-gold-soft/90">
          {t("noSlotsMessage")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Select
        value={selectedTime ?? ""}
        onValueChange={(v) => v && onSelectTime(v)}
      >
        <SelectTrigger className="w-full min-h-[48px] sm:min-h-[48px] h-12 bg-white/5 border-white/10 text-icyWhite hover:bg-white/[0.07] focus:ring-gold-soft/30 text-base touch-manipulation">
          <SelectValue placeholder={t("availableTime")} />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] z-[100]">
          {availableSlots.map((slot) => (
            <SelectItem
              key={slot}
              value={slot}
              className="text-icyWhite focus:bg-gold-soft/20 focus:text-icyWhite"
            >
              {formatSlot(slot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
