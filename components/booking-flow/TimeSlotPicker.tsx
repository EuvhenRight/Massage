"use client";

import { formatTimeFromSlotString } from "@/lib/format-date";
import type { BookingAccent } from "@/lib/booking-accent";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  accent: BookingAccent;
  date: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  occupiedSlots: OccupiedSlot[];
  durationMinutes: number;
  schedule?: ScheduleData | null;
}

export default function TimeSlotPicker({
  accent,
  date,
  selectedTime,
  onSelectTime,
  occupiedSlots,
  durationMinutes,
  schedule = null,
}: TimeSlotPickerProps) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState(false);
  const availableSlots = useMemo(
    () => getAvailableTimeSlots(date, durationMinutes, occupiedSlots, schedule),
    [date, durationMinutes, occupiedSlots, schedule]
  );

  const t = useTranslations("booking");
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const hasSelection = selectedTime !== null && selectedTime !== "";

  useEffect(() => {
    if (hasSelection) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    const timer = window.setTimeout(() => setHighlight(false), 1800);
    return () => window.clearTimeout(timer);
  }, [dateKey, hasSelection]);

  if (availableSlots.length === 0) {
    return (
      <div ref={containerRef} className={`rounded-lg border px-4 py-4 ${accent.timeSlotEmptyBorder} ${accent.timeSlotEmptyBg}`}>
        <p className={`text-sm ${accent.timeSlotEmptyText}`}>
          {t("noSlotsMessage")}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`scroll-mt-4 space-y-2 rounded-xl p-2 transition-all duration-700 ${
        highlight
          ? "ring-2 ring-gold-soft/70 bg-gold-soft/5"
          : "ring-0 ring-transparent bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <span
          className={`text-sm font-medium transition-colors ${
            highlight ? "text-gold-soft" : "text-icyWhite/80"
          }`}
        >
          {t("selectTime")}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-icyWhite/60">
          {availableSlots.length}
        </span>
      </div>
      <Select
        value={selectedTime ?? ""}
        onValueChange={(v) => v && onSelectTime(v)}
      >
        <SelectTrigger
          className={`w-full min-h-[48px] h-12 bg-white/5 border-0 ${accent.inputBorder} text-icyWhite hover:bg-white/[0.07] text-base touch-manipulation ${accent.selectTriggerRing}`}
        >
          <SelectValue placeholder={t("availableTime")} />
        </SelectTrigger>
        <SelectContent className="max-h-[260px] z-[100]">
          {availableSlots.map((slot) => (
            <SelectItem
              key={slot}
              value={slot}
              className={accent.selectItemFocus}
            >
              {formatTimeFromSlotString(slot, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
